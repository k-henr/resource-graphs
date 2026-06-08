(() => {
  // scripts/errors.ts
  var UserError = class extends Error {
  };
  var GraphError = class extends Error {
  };
  var ProgramError = class extends Error {
  };
  function displayErr(e) {
    if (e instanceof UserError) {
      alert(`${e.message}`);
    } else if (e instanceof GraphError) {
      alert(`Configuration error: ${e.message}`);
    } else if (e instanceof ProgramError) {
      alert(`INTERNAL ERROR: ${e.message}

Please report this as a bug!`);
    }
    throw e;
  }

  // scripts/rational.ts
  var Rational = class _Rational {
    // Split into "a b/c", "a", "a/b", "a.b" or "a.b c/d", or any negations of
    // these. Also puts the parts into their respective groups
    static patternMatcher = /^ *(?<NEG>-)? *(?:(?<FULL>\d*?(?:\.\d*)?)) *(?:(?<NUM>\d+) *\/ *(?<DEN>\d+))? *$/;
    // These are just normal numbers atm, do I need bigint?
    numerator;
    denominator;
    static zero = new _Rational(0);
    static one = new _Rational(1);
    constructor(num, den = 1) {
      function numDecimals(x) {
        if (Math.floor(x) !== x) return x.toString().split(".")[1].length || 0;
        return 0;
      }
      if (Math.floor(num) !== num || Math.floor(den) !== den) {
        const maxDecimalLength = Math.max(
          numDecimals(Math.abs(num)),
          numDecimals(Math.abs(den))
        );
        const factor = Math.pow(10, maxDecimalLength);
        num *= factor;
        den *= factor;
      }
      function gcd(a, b) {
        if (!b) return a;
        return gcd(b, a % b);
      }
      const common = gcd(num, den);
      this.numerator = num / common;
      this.denominator = den / common;
    }
    static fromData(data) {
      return typeof data === "number" ? new _Rational(data, 1) : new _Rational(data[0], data[1]);
    }
    // Parse the input from an input element into a rational, or make the input node
    // red if unparsable
    static fromInput(inputString, inputEl) {
      const match = inputString.match(_Rational.patternMatcher);
      if (!match || !match.groups) {
        inputEl?.classList.add("input-invalid-amount");
        return null;
      }
      inputEl?.classList.remove("input-invalid-amount");
      const sgn = match.groups.NEG ? -1 : 1;
      const full = match.groups.FULL ? Number(match.groups.FULL) : 0;
      const num = match.groups.NUM ? Number(match.groups.NUM) : 0;
      const den = match.groups.DEN ? Number(match.groups.DEN) : 1;
      return new _Rational(sgn * (full * den + num), den);
    }
    add(v2) {
      return new _Rational(
        this.numerator * v2.denominator + v2.numerator * this.denominator,
        this.denominator * v2.denominator
      );
    }
    sub(v2) {
      return new _Rational(
        this.numerator * v2.denominator - v2.numerator * this.denominator,
        this.denominator * v2.denominator
      );
    }
    mul(v) {
      if (typeof v === "number") {
        return new _Rational(this.numerator * v, this.denominator);
      } else {
        return new _Rational(
          this.numerator * v.numerator,
          this.denominator * v.denominator
        );
      }
    }
    div(v2) {
      return new _Rational(
        this.numerator * v2.denominator,
        this.denominator * v2.numerator
      );
    }
    pow(v2) {
      if (v2.denominator !== 1)
        throw new GraphError(
          "There's currently no support for raising a number to a non-integer!"
        );
      return new _Rational(
        Math.pow(this.numerator, v2.numerator),
        Math.pow(this.denominator, v2.denominator)
      );
    }
    negate() {
      return new _Rational(-this.numerator, this.denominator);
    }
    abs() {
      return new _Rational(Math.abs(this.numerator), Math.abs(this.denominator));
    }
    equals(v2) {
      return this.numerator === v2.numerator && this.denominator === v2.denominator;
    }
    lessThan(v2) {
      const temp = this.numerator * v2.denominator < v2.numerator * this.denominator;
      return temp === (this.denominator < 0 === v2.denominator < 0);
    }
    greaterThan(v2) {
      const temp = this.numerator * v2.denominator > v2.numerator * this.denominator;
      return temp === (this.denominator < 1 === v2.denominator < 1);
    }
    // Get decimals
    getDecimalString() {
      if (this.numerator === 0) return "0";
      const x = this.numerator / this.denominator;
      let rounded = x.toPrecision(5);
      rounded = rounded.replace(/\.0*$|(\.\d*?)0+$/, "$1");
      return rounded;
    }
    getMixedFractionString() {
      if (this.numerator === 0) return "0";
      const isNeg = Math.sign(this.numerator) !== Math.sign(this.denominator);
      const num = Math.abs(this.numerator);
      const den = Math.abs(this.denominator);
      const whole = Math.floor(num / den);
      const rest = num - whole * den;
      return `${isNeg ? "-" : ""}${whole !== 0 ? whole : ""}${whole !== 0 && rest !== 0 ? " " : ""}${rest !== 0 ? `${rest}/${den}` : ""}`;
    }
    getList() {
      return [this.numerator, this.denominator];
    }
  };

  // scripts/converter.ts
  var Converter = class {
    // All the inputs and outputs of this conversion
    ingredients;
    products;
    name;
    image;
    constructor(name, image, ingredients, products) {
      this.name = name;
      this.image = image;
      this.ingredients = ingredients;
      this.products = products;
    }
    /**
     * Apply this conversion to a given graph, consuming and adding items. This can
     * be overriden by special converters
     * @param graph The graph to apply the conversion to
     * @param count The "count" of this converter
     */
    apply(deltas, count) {
      for (const { resource, amount } of this.products) {
        deltas.add(resource, amount.mul(count));
      }
      for (const { resource, amount } of this.ingredients) {
        deltas.add(resource, amount.mul(count).negate());
      }
    }
    getDisplayName() {
      return this.name;
    }
    getDisplayImage() {
      return this.image;
    }
    getIngredients() {
      return this.ingredients;
    }
    // Get the number of this converter required to produce the given amount of the given resource
    getAmountToProduce(resource, amount) {
      let total = Rational.zero;
      for (const { resource: r, amount: a } of this.ingredients) {
        if (r === resource) {
          total = total.sub(a);
          break;
        }
      }
      for (const { resource: r, amount: a } of this.products) {
        if (r === resource) {
          total = total.add(a);
          break;
        }
      }
      if (!total.greaterThan(Rational.zero)) {
        alert(
          "The converter isn't producing any of the requested resource due to the settings chosen. No converter will be added."
        );
        return Rational.zero;
      }
      return amount.div(total).negate();
    }
    consumesIngredient(ingr) {
      for (const { resource } of this.ingredients) {
        if (resource === ingr) return true;
      }
      return false;
    }
    producesProduct(prod) {
      for (const { resource } of this.products) {
        if (resource === prod) return true;
      }
      return false;
    }
  };

  // scripts/template.ts
  var Template = class {
    el;
    constructor(id) {
      const templateEl = document.querySelector(
        `template#${id}`
      );
      if (!templateEl) throw new ProgramError(`Template "${id}" not found!`);
      this.el = templateEl;
    }
    clone() {
      if (!this.el.content) throw new ProgramError(`Template is empty!`);
      return this.el.content.cloneNode(true);
    }
    cloneElement() {
      const el = this.clone();
      if (!el.firstElementChild)
        throw new ProgramError(`Template contains no child!`);
      return el.firstElementChild;
    }
  };

  // scripts/converter-setting/converterSetting.ts
  var ConverterSetting = class _ConverterSetting {
    element;
    static settingInputTemplate = new Template(
      "converter-setting-input-template"
    );
    static settingSelectTemplate = new Template(
      "converter-setting-select-template"
    );
    constructor(element) {
      if (!element)
        throw new ProgramError("Setting element not found on template");
      this.element = element;
    }
    getElement() {
      return this.element;
    }
    static makeInputElement(name, unit, requestingConverter) {
      const settingEl = _ConverterSetting.settingInputTemplate.clone();
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("input");
      const post = settingEl.querySelector("span");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      post.innerText = unit ?? "";
      input.onchange = () => requestingConverter.tryPopulateInfoPanel();
      return [settingEl, label, input];
    }
    static makeSelectElement(name, requestingConverter) {
      const settingEl = _ConverterSetting.settingSelectTemplate.clone();
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("select");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      input.onchange = () => requestingConverter.tryPopulateInfoPanel();
      return [settingEl, label, input];
    }
  };

  // scripts/converter-setting/converterEnumerateSetting.ts
  var ConverterEnumerateSetting = class extends ConverterSetting {
    selectElement;
    constructor(name, defaultOption, options, requestingConverter) {
      const [settingEl, , select] = ConverterSetting.makeSelectElement(
        name,
        requestingConverter
      );
      for (const optionName of options) {
        const optionEl = document.createElement("option");
        optionEl.value = optionName;
        optionEl.innerText = optionName;
        select.appendChild(optionEl);
        const defIndex = options.indexOf(defaultOption);
        if (defIndex === -1)
          throw new GraphError(
            `Default option "${defaultOption}" not present on setting "${name}"!`
          );
        select.selectedIndex = defIndex;
      }
      super(settingEl.firstElementChild);
      this.selectElement = select;
    }
    chooseBranch(data) {
      const node = data;
      if (!Object.hasOwn(node, "options")) {
        throw new GraphError(
          `Instance of enumerate setting "${data.name}" lacks option list!`
        );
      }
      const chosen = String(this.selectElement.value);
      for (const [selector, option] of node.options) {
        const selectorMatches = typeof selector === "string" ? selector === chosen : selector.indexOf(chosen) !== -1;
        if (selectorMatches) return option;
      }
      throw new GraphError(
        `An instance of the enumerate setting ${data.name} doesn't cover the option ${chosen}!`
      );
    }
    getElement() {
      return this.element;
    }
    getFormattedString(_) {
      return this.selectElement.value;
    }
  };

  // scripts/converter-setting/converterNumberSetting.ts
  var ConverterNumberSetting = class extends ConverterSetting {
    inputElement;
    constructor(name, defaultValue, unit, requestingConverter) {
      const [settingEl, , input] = ConverterSetting.makeInputElement(
        name,
        unit,
        requestingConverter
      );
      input.type = "text";
      input.value = defaultValue.getMixedFractionString();
      super(settingEl.firstElementChild);
      this.inputElement = input;
    }
    chooseBranch(_) {
      return Rational.fromInput(
        this.inputElement.value,
        this.inputElement
      )?.getList() ?? 0;
    }
    getFormattedString(_) {
      const rational = Rational.fromInput(this.inputElement.value, null);
      return rational?.getDecimalString() ?? "???";
    }
  };

  // scripts/converter-setting/converterToggleSetting.ts
  var ConverterToggleSetting = class extends ConverterSetting {
    inputElement;
    constructor(name, defaultValue, requestingConverter) {
      const [settingEl, , input] = ConverterSetting.makeInputElement(
        name,
        "",
        requestingConverter
      );
      input.type = "checkbox";
      input.checked = defaultValue;
      super(settingEl.firstElementChild);
      this.inputElement = input;
    }
    chooseBranch(data) {
      const node = data;
      if (!Object.hasOwn(node, "true") || !Object.hasOwn(node, "false")) {
        throw new GraphError(
          `A branch is missing from the toggle setting "${data.name}"!`
        );
      }
      return this.inputElement.checked ? node.true : node.false;
    }
    getElement() {
      return this.element;
    }
    getFormattedString(args) {
      return this.inputElement.checked ? args[1] ?? "" : args[2] ?? "";
    }
  };

  // scripts/converterSettings.ts
  var ConverterSettings = class _ConverterSettings {
    settingsLookup = /* @__PURE__ */ new Map();
    // todo: make non-static?
    static settingsForm = document.querySelector("#converter-settings-form");
    constructor(settings, requestingConverter) {
      _ConverterSettings.settingsForm.innerHTML = "";
      for (const data of settings) {
        const setting = _ConverterSettings.makeSettingInstance(
          data,
          requestingConverter
        );
        _ConverterSettings.settingsForm.appendChild(setting.getElement());
        this.settingsLookup.set(data.name, setting);
      }
    }
    static makeSettingInstance(data, requestingConverter) {
      switch (data.type) {
        case "NUMBER":
          return new ConverterNumberSetting(
            data.name,
            Rational.fromData(data.default),
            data.unit ?? null,
            requestingConverter
          );
        case "TOGGLE":
          return new ConverterToggleSetting(
            data.name,
            data.default,
            requestingConverter
          );
        case "ENUMERATE":
          return new ConverterEnumerateSetting(
            data.name,
            data.default,
            data.options,
            requestingConverter
          );
      }
    }
    getBranch(node) {
      const setting = this.settingsLookup.get(node.name);
      if (!setting) throw new GraphError(`Setting ${node.name} doesn't exist!`);
      return setting.chooseBranch(node);
    }
    getAllSettings() {
      throw new ProgramError("Not implemented!");
    }
    parseFormattedString(input) {
      return input.replaceAll(
        /\{(.*?)\}/gim,
        (_, inner) => this.parseFormatting(inner)
      );
    }
    // Replace a given string with the text it represents from settings data
    parseFormatting(toFormat) {
      const args = toFormat.split("|");
      const settingName = args[0];
      const setting = this.settingsLookup.get(settingName);
      if (!setting)
        throw new GraphError(
          `Setting "${settingName}" not found! Have you misspelt a formatting string?`
        );
      return setting.getFormattedString(args);
    }
  };

  // scripts/resource-tree/nothingNode.ts
  var NothingNode = class _NothingNode {
    static converterIngredientTemplate = new Template(
      "converter-ingredient-template"
    );
    getElement(_parent, _settings, _multiplier, _requestingConverter) {
      const el = _NothingNode.converterIngredientTemplate.cloneElement();
      el.querySelector(".converter-ingredient-name").innerText = `[Nothing]`;
      el.querySelector(".converter-ingredient-image").remove();
      return el;
    }
    addResourcesToList(output, _) {
      return output;
    }
  };

  // scripts/intermediateConverter.ts
  var IntermediateConverter = class _IntermediateConverter {
    displayName;
    // Stored unformatted
    thumbName;
    displayImage;
    settings;
    entangledOrs = [];
    // Ingredients and products
    ingredientTree;
    productTree;
    static infoTemplate = new Template("converter-info-template");
    static infoPanel = document.querySelector("#rc-info-panel");
    constructor(displayName, thumbName, displayImage, settingList, ingredientTree, productTree) {
      this.displayName = displayName;
      this.thumbName = thumbName;
      this.displayImage = displayImage;
      this.ingredientTree = ingredientTree;
      this.productTree = productTree;
      this.settings = new ConverterSettings(settingList, this);
    }
    getThumbName() {
      return this.thumbName;
    }
    getDisplayName() {
      return this.settings.parseFormattedString(this.displayName);
    }
    getDisplayImage() {
      return this.displayImage;
    }
    // Returns a finalized converter, provided that all ambiguities are resolved
    finalize() {
      const ingr = this.ingredientTree.addResourcesToList(
        [],
        this.settings,
        Rational.one
      );
      const prod = this.productTree.addResourcesToList(
        [],
        this.settings,
        Rational.one
      );
      return new Converter(this.getDisplayName(), this.displayImage, ingr, prod);
    }
    tryPopulateInfoPanel() {
      try {
        this.populateInfoPanel();
      } catch (e) {
        displayErr(e);
        throw e;
      }
    }
    // Populate an info panel with information regarding this converter
    populateInfoPanel() {
      _IntermediateConverter.infoPanel.innerHTML = "";
      const el = _IntermediateConverter.infoTemplate.clone();
      el.querySelector(".rc-info-header").innerText = this.getDisplayName();
      el.querySelector(".rc-info-image").src = this.getDisplayImage();
      this.entangledOrs = [];
      el.querySelector(".c-info-ingredients").appendChild(
        this.getTreeElement(this.ingredientTree)
      );
      el.querySelector(".c-info-products").appendChild(
        this.getTreeElement(this.productTree)
      );
      _IntermediateConverter.infoPanel.appendChild(el);
    }
    getTreeElement(tree) {
      const el = tree.getElement(null, this.settings, Rational.one, this);
      if (el) return el;
      const fallback = new NothingNode().getElement(
        null,
        this.settings,
        Rational.one,
        this
      );
      if (!fallback) {
        throw new ProgramError(
          "Failed to generate resource tree fallback element for empty resource tree!"
        );
      }
      return fallback;
    }
    registerEntangledOr(id, node) {
      this.entangledOrs.push([id, node]);
    }
    unregisterEntangledOr(node) {
      for (let i = 0; i < this.entangledOrs.length; i++) {
        if (this.entangledOrs[i][1] === node) {
          this.entangledOrs.splice(i, 1);
          return;
        }
      }
    }
    collapseEntangledOrs(entangledOrId, optionId) {
      for (const data of [...this.entangledOrs]) {
        const [id, node] = data;
        if (id !== entangledOrId) continue;
        node.collapseNodeUsingId(optionId);
        this.unregisterEntangledOr(node);
      }
    }
  };

  // scripts/resource.ts
  var Resource = class _Resource {
    static infoTemplate = new Template("resource-info-template");
    displayName;
    displayImage;
    tags;
    unitGroupName;
    constructor(name, image, tags, unitGroup) {
      this.displayName = name;
      this.displayImage = image;
      this.tags = tags;
      this.unitGroupName = unitGroup;
    }
    getDisplayName() {
      return this.displayName;
    }
    getDisplayImage() {
      return this.displayImage;
    }
    getUnitGroupName() {
      return this.unitGroupName;
    }
    getTags() {
      return [...this.tags];
    }
    // (assumes an empty info panel element)
    populateInfoPanel(panel) {
      const el = _Resource.infoTemplate.clone();
      el.querySelector(".rc-info-header").innerText = this.getDisplayName();
      el.querySelector(".rc-info-image").src = this.getDisplayImage();
      panel.appendChild(el);
    }
  };

  // scripts/resource-tree/resourceTreeBoolNode.ts
  var ResourceTreeBoolNode = class {
    children;
    constructor(children) {
      this.children = children;
    }
    replaceChild(oldChild, newChild) {
      for (const i in this.children) {
        if (this.children[i] === oldChild) {
          this.children[i] = newChild;
          return;
        }
      }
      throw new ProgramError(
        "Child not found in boolean node when trying to replace it!"
      );
    }
  };

  // scripts/resource-tree/andNode.ts
  var AndNode = class extends ResourceTreeBoolNode {
    constructor(children) {
      super(children);
    }
    getElement(_, settings, multiplier, requestingConverter) {
      const andEl = document.createElement("div");
      this.children.map((child) => {
        const cEl = child.getElement(
          this,
          settings,
          multiplier,
          requestingConverter
        );
        if (cEl) andEl.appendChild(cEl);
      });
      return andEl.childNodes.length !== 0 ? andEl : null;
    }
    addResourcesToList(output, settings, multiplier = Rational.one) {
      this.children.map((c) => c.addResourcesToList(output, settings, multiplier));
      return output;
    }
  };

  // scripts/resource-tree/orNode.ts
  var OrNode = class _OrNode extends ResourceTreeBoolNode {
    constructor(options) {
      super(options);
    }
    // Element representing an option
    static converterSelectTemplate = new Template(
      "converter-select-template"
    );
    // Element inbetween options that just says "OR"
    static converterOrTemplate = new Template("converter-or-template");
    getElement(parent, settings, multiplier, requestingConverter) {
      if (!parent) throw new GraphError("An OR node can't be a root node!");
      const selectEl = _OrNode.converterSelectTemplate.cloneElement();
      const selectList = selectEl.querySelector(
        ".converter-select-children"
      );
      let numOptions = 0;
      let encounteredEmptyNode = false;
      let encounteredNonemptyNode = false;
      for (let i = 0; i < this.children.length; i++) {
        const el = this.addOptionElement(
          this.children[i],
          settings,
          multiplier,
          parent,
          selectEl,
          selectList,
          requestingConverter
        );
        if (el === null) {
          encounteredEmptyNode = true;
        } else {
          numOptions++;
          encounteredNonemptyNode = true;
          if (i !== this.children.length - 1) this.addOrElement(selectList);
        }
      }
      if (encounteredEmptyNode || !encounteredNonemptyNode) {
        if (numOptions != 0) this.addOrElement(selectList);
        numOptions++;
        const nothingNode = new NothingNode();
        this.addOptionElement(
          nothingNode,
          settings,
          multiplier,
          parent,
          selectEl,
          selectList,
          requestingConverter
        );
      }
      selectEl.querySelector(".converter-select-count").innerText = String(numOptions);
      return selectEl;
    }
    // Add an element for the given option
    addOptionElement(option, settings, multiplier, parent, selectEl, selectList, requestingConverter) {
      const optionEl = option.getElement(
        this,
        settings,
        multiplier,
        requestingConverter
      );
      if (optionEl) {
        optionEl.classList.add("primary", "interactive");
        selectList.appendChild(optionEl);
        optionEl.onclick = this.getOnClickForOption(
          parent,
          option,
          selectEl,
          optionEl,
          requestingConverter
        );
      } else {
        return null;
      }
      return optionEl;
    }
    addOrElement(list) {
      const orEl = _OrNode.converterOrTemplate.clone();
      list.appendChild(orEl);
    }
    getOnClickForOption(parent, option, selectEl, optionEl, requestingConverter) {
      return () => {
        try {
          this.collapseNode(
            parent,
            option,
            selectEl,
            optionEl,
            requestingConverter
          );
        } catch (e) {
          displayErr(e);
          throw e;
        }
      };
    }
    // Collapse this node with the given option
    collapseNode(orParent, option, selectEl, optionEl, _requestingConverter) {
      orParent.replaceChild(this, option);
      selectEl.replaceWith(optionEl);
      optionEl.classList.remove("primary", "interactive");
      optionEl.onclick = null;
    }
    addResourcesToList(_, __, ___ = Rational.one) {
      throw new UserError(
        "All OR nodes aren't resolved, please choose an option!"
      );
    }
  };

  // scripts/resource-tree/entangledOr.ts
  var EntangledOrNode = class extends OrNode {
    // The ID of this converter
    id;
    // I store the IDs separate to the resources since I want to be able ot extend OR
    // and can't be bothered making a generic class solution work
    optionIds;
    // The onclick functions that have been generated, to simulate choosing one when
    // collapsing
    onclicks = /* @__PURE__ */ new Map();
    constructor(id, options) {
      super(options.map(([, r]) => r));
      this.id = id;
      this.optionIds = options.map(([id2]) => id2);
    }
    getElement(parent, settings, multiplier, requestingConverter) {
      const el = super.getElement(
        parent,
        settings,
        multiplier,
        requestingConverter
      );
      if (!el) return null;
      requestingConverter.registerEntangledOr(this.id, this);
      return el;
    }
    // When creating the onclick, also store it in a dictionary here
    getOnClickForOption(parent, option, selectEl, optionEl, requestingConverter) {
      const onclickNoEntTrigger = () => {
        try {
          super.collapseNode(
            parent,
            option,
            selectEl,
            optionEl,
            requestingConverter
          );
        } catch (e) {
          displayErr(e);
          throw e;
        }
      };
      const id = this.optionIds[this.children.indexOf(option)];
      this.onclicks.set(id, onclickNoEntTrigger);
      return super.getOnClickForOption(
        parent,
        option,
        selectEl,
        optionEl,
        requestingConverter
      );
    }
    collapseNodeUsingId(id) {
      const onclick = this.onclicks.get(id);
      if (!onclick)
        throw new GraphError(
          `Option with id ${id} not present on this entangled OR!`
        );
      onclick();
    }
    // Override the collapseNode function so that when this node collapses, it also
    // collapses the others
    collapseNode(orParent, option, selectEl, optionEl, requestingConverter) {
      const optionId = this.optionIds[this.children.indexOf(option)];
      super.collapseNode(
        orParent,
        option,
        selectEl,
        optionEl,
        requestingConverter
      );
      requestingConverter.unregisterEntangledOr(this);
      requestingConverter.collapseEntangledOrs(this.id, optionId);
    }
  };

  // scripts/resource-tree/multiplierNode.ts
  var MultiplierNode = class {
    multiplierAst;
    resource;
    constructor(multiplierAst, resource) {
      this.multiplierAst = multiplierAst;
      this.resource = resource;
    }
    getElement(_, settings, multiplier, requestingConverter) {
      const newMultiplier = this.evaluateSettingsTree(
        this.multiplierAst,
        settings
      );
      multiplier = multiplier.mul(newMultiplier);
      if (multiplier.equals(Rational.zero)) return null;
      return this.resource.getElement(
        this,
        settings,
        multiplier,
        requestingConverter
      );
    }
    addResourcesToList(output, settings, multiplier) {
      multiplier = multiplier.mul(
        this.evaluateSettingsTree(this.multiplierAst, settings)
      );
      if (multiplier.equals(Rational.zero)) return output;
      this.resource.addResourcesToList(output, settings, multiplier);
      return output;
    }
    replaceChild(oldChild, newChild) {
      if (this.resource !== oldChild)
        throw new ProgramError(
          "Tried to replace a resource on a MULTIPLIER that wasn't present on the node!"
        );
      this.resource = newChild;
    }
    evaluateSettingsTree(treeNode, settings) {
      if (typeof treeNode === "number" || Array.isArray(treeNode))
        return Rational.fromData(treeNode);
      switch (treeNode.type) {
        case "SETTING":
          return this.evaluateSettingsTree(
            settings.getBranch(treeNode),
            settings
          );
        case "MUL":
          let p = Rational.one;
          for (const child of treeNode.values)
            p = p.mul(this.evaluateSettingsTree(child, settings));
          return p;
        case "DIV":
          return this.evaluateSettingsTree(treeNode.value1, settings).div(
            this.evaluateSettingsTree(treeNode.value2, settings)
          );
        case "ADD":
          let s = Rational.zero;
          for (const child of treeNode.values)
            s = s.add(this.evaluateSettingsTree(child, settings));
          return s;
        case "SUB":
          return this.evaluateSettingsTree(treeNode.value1, settings).sub(
            this.evaluateSettingsTree(treeNode.value2, settings)
          );
        case "POW":
          return this.evaluateSettingsTree(treeNode.value1, settings).pow(
            this.evaluateSettingsTree(treeNode.value2, settings)
          );
        default:
          throw new GraphError(
            `Unknown settings AST node type: ${treeNode.type}!`
          );
      }
    }
  };

  // scripts/units.ts
  var unitGroups = /* @__PURE__ */ new Map();
  var defaultUnitGroup = "UNINITIALIZED";
  function getDefaultUnitGroup() {
    return defaultUnitGroup;
  }
  function loadUnitGroups(groups, defaultGroup) {
    defaultUnitGroup = defaultGroup;
    for (const [name, group] of groups) {
      unitGroups.set(name, {
        default: group.default,
        conversions: group.conversions.map(([name2, r]) => [
          name2,
          Rational.fromData(r)
        ])
      });
    }
  }
  function convertUnit(groupName, amount, unit) {
    const group = unitGroups.get(groupName);
    if (!group) throw new GraphError(`Unit group ${groupName} not found!`);
    if (group.default === unit) return amount;
    const conv = group.conversions.find(([name]) => name === unit);
    if (!conv)
      throw new GraphError(
        `Unit ${unit} can't be found in unit group ${groupName}!`
      );
    return amount.mul(conv[1]);
  }
  function getUnits(groupName) {
    const group = unitGroups.get(groupName);
    if (!group) throw new GraphError(`Unit group ${groupName} not found!`);
    const output = [group.default];
    group.conversions.map((el) => output.push(el[0]));
    return [output, group.default];
  }
  function populateUnitDropdown(selectEl, groupName) {
    selectEl.innerHTML = "";
    const [units, defaultUnit] = getUnits(groupName);
    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const optionEl = document.createElement("option");
      optionEl.innerText = unit;
      selectEl.appendChild(optionEl);
      if (unit === defaultUnit) {
        optionEl.selected = true;
        selectEl.selectedIndex = i;
      }
    }
  }

  // scripts/resource-tree/resourceNode.ts
  var ResourceNode = class _ResourceNode {
    id;
    amount;
    // Template for a resource element
    static converterIngredientTemplate = new Template(
      "converter-ingredient-template"
    );
    constructor(id, amount) {
      this.id = id;
      this.amount = amount;
    }
    getElement(_, __, multiplier, ___) {
      const resEl = this.createIngredientElement(multiplier);
      return resEl;
    }
    addResourcesToList(output, _, multiplier = Rational.one) {
      output.push({
        resource: getResource(this.id),
        amount: this.amount.mul(multiplier)
      });
      return output;
    }
    createIngredientElement(multiplier) {
      const el = _ResourceNode.converterIngredientTemplate.cloneElement();
      const res = getResource(this.id);
      const unit = res.getUnitGroupName();
      el.querySelector(".converter-ingredient-name").innerText = res.getDisplayName();
      el.querySelector(".converter-ingredient-amount").innerText = `\u2A09 ${this.amount.mul(multiplier).getDecimalString()} ${getUnits(unit)[1]}`;
      el.querySelector(".converter-ingredient-image").src = res.getDisplayImage();
      return el;
    }
  };

  // scripts/data.ts
  var loadedResources = /* @__PURE__ */ new Map();
  var loadedConverterFactories = /* @__PURE__ */ new Map();
  var graphName = window.location.hash.replace(/^#/, "");
  function getSrc(src) {
    return `data/${graphName}/${src}`;
  }
  async function loadAllResources() {
    const res = await fetch(`data/${graphName}/resources.json`);
    if (!res.ok)
      throw new GraphError(
        "Error during resource loading, resources.json doesn't exist!"
      );
    const json = await res.json();
    for (const data of json) {
      const r = new Resource(
        data.displayName,
        getSrc(data.displayImage),
        data.tags ?? [],
        data.unitGroup ?? getDefaultUnitGroup()
      );
      loadedResources.set(data.id, r);
    }
  }
  function getResource(id) {
    const r = loadedResources.get(id);
    if (!r) throw new GraphError(`Couldn't find resource "${id}"!`);
    return r;
  }
  function getResourcesWithTags(tag) {
    const list = loadedResources.entries();
    const output = [];
    for (const [id, r] of list) {
      if (typeof tag === "string") {
        if (r.getTags().indexOf(tag) !== -1) output.push([id, r]);
      } else {
        let match = true;
        const tags = r.getTags();
        tag.forEach((el) => match = match && tags.indexOf(el) !== -1);
        if (match) output.push([id, r]);
      }
    }
    return output;
  }
  function getResourcesWithFilter(searchString = "") {
    const list = loadedResources.entries();
    const output = [];
    for (const [id, r] of list) {
      if (searchString && !r.getDisplayName().toLowerCase().includes(searchString.toLowerCase()))
        continue;
      output.push([id, r]);
    }
    return output;
  }
  async function loadAllConverters() {
    const res = await fetch(`data/${graphName}/converters.json`);
    if (!res.ok)
      throw new GraphError(
        "Error during resource loading, converter.json doesn't exist!"
      );
    const json = await res.json();
    for (const data of json) {
      const possibleIngr = getAllPossibleResources(andWrap(data.consumes), []);
      const possibleProd = getAllPossibleResources(andWrap(data.produces), []);
      loadedConverterFactories.set(data.id, {
        name: data.thumbName ?? data.displayName,
        image: getSrc(data.displayImage),
        tags: data.tags ?? [],
        possibleIngredients: possibleIngr,
        possibleProducts: possibleProd,
        factory: () => {
          try {
            return new IntermediateConverter(
              data.displayName,
              data.thumbName ?? data.displayName,
              getSrc(data.displayImage),
              data.settings ?? [],
              resourceTreeDataToClass(andWrap(data.consumes)),
              resourceTreeDataToClass(andWrap(data.produces))
            );
          } catch (e) {
            displayErr(e);
            throw e;
          }
        }
      });
    }
  }
  function resourceTreeDataToClass(data) {
    switch (data.type) {
      case "RESOURCE":
        return new ResourceNode(data.id, Rational.fromData(data.amount));
      case "AND":
        return new AndNode(
          data.resources.map((el) => resourceTreeDataToClass(el))
        );
      case "OR":
        const options = [];
        for (const c of data.resources) handleOrInput(c, options);
        return new OrNode(options);
      case "ENTANGLED_OR":
        return new EntangledOrNode(
          data.id,
          data.resources.map(([id, rD]) => [id, resourceTreeDataToClass(rD)])
        );
      case "MULTIPLIER":
        return new MultiplierNode(
          data.multiplier,
          resourceTreeDataToClass(data.resource)
        );
      case "TAG":
        const resources = getResourcesWithTags(data.tagName);
        const resourceData = resources.map(
          ([id]) => makeResourceFromIdAndAmount(id, data.amount)
        );
        const orNode = {
          type: "OR",
          resources: resourceData
        };
        return resourceTreeDataToClass(orNode);
    }
  }
  function handleOrInput(tree, output) {
    switch (tree.type) {
      case "RESOURCE":
      case "AND":
      case "OR":
      case "MULTIPLIER":
        output.push(resourceTreeDataToClass(tree));
        break;
      case "TAG":
        const amount = Rational.fromData(tree.amount);
        const resources = getResourcesWithTags(tree.tagName);
        for (const [id] of resources) {
          output.push(new ResourceNode(id, amount));
        }
        break;
    }
  }
  function makeResourceFromIdAndAmount(id, amount) {
    return { type: "RESOURCE", id, amount };
  }
  function andWrap(r) {
    return { type: "AND", resources: r };
  }
  function getAllPossibleResources(data, output) {
    switch (data.type) {
      case "RESOURCE":
        output.push(getResource(data.id));
        return output;
      case "AND":
      case "OR":
        data.resources.map((el) => getAllPossibleResources(el, output));
        return output;
      case "MULTIPLIER":
        return getAllPossibleResources(data.resource, output);
      case "TAG":
        const resources = getResourcesWithTags(data.tagName);
        for (const [, r] of resources) output.push(r);
        return output;
      case "ENTANGLED_OR":
        data.resources.map(([, r]) => getAllPossibleResources(r, output));
        return output;
    }
  }
  function getConverterFactoriesWithFilters(searchString = "", anyResourceProduced = [], anyResourceConsumed = []) {
    const list = loadedConverterFactories.entries();
    const output = [];
    for (const [id, c] of list) {
      if (searchString && !c.name.toLowerCase().includes(searchString.toLowerCase()))
        continue;
      let consumesPasses = anyResourceConsumed.length == 0;
      for (const consFilter of anyResourceConsumed) {
        consumesPasses = c.possibleIngredients.indexOf(consFilter) !== -1;
        if (consumesPasses) break;
      }
      if (!consumesPasses) continue;
      let producePasses = anyResourceProduced.length == 0;
      for (const prodFilter of anyResourceProduced) {
        producePasses = c.possibleProducts.indexOf(prodFilter) !== -1;
        if (producePasses) break;
      }
      if (!producePasses) continue;
      output.push([id, c]);
    }
    return output;
  }

  // scripts/resourceGraph.ts
  var NumberedSet = class {
    numberMap = /* @__PURE__ */ new Map();
    set(object, newNumber) {
      this.numberMap.set(object, newNumber);
    }
    add(object, delta) {
      this.numberMap.set(
        object,
        (this.numberMap.get(object) ?? Rational.zero).add(delta)
      );
    }
    remove(object) {
      this.numberMap.delete(object);
    }
    getEntries() {
      return this.numberMap.entries();
    }
  };
  var ResourceGraph = class {
    // All conversions that are happening
    converters = new NumberedSet();
    // A ConverterMenu to request converters from in case of adjusting to fit an item
    converterRequestTarget;
    // Whether the graph needs to be updated or not
    requiresRecalculation = true;
    // List elements to put the displays in
    resourceDeltaList;
    converterList;
    resourceDeltaTemplate;
    converterTemplate;
    constructor(resourceDeltaList, converterList, resourceDeltaTemplate, converterTemplate) {
      this.resourceDeltaList = resourceDeltaList;
      this.converterList = converterList;
      this.resourceDeltaTemplate = resourceDeltaTemplate;
      this.converterTemplate = converterTemplate;
      requestAnimationFrame(() => requestGraphUpdate(this));
    }
    setConverterRequestTarget(menu) {
      this.converterRequestTarget = menu;
    }
    // Update the resource deltas and display. Runs automatically
    recalculateIfNeeded() {
      if (!this.requiresRecalculation) return;
      this.requiresRecalculation = false;
      const resourceDeltas = new NumberedSet();
      for (const [converter, count] of this.converters.getEntries()) {
        converter.apply(resourceDeltas, count);
      }
      this.resourceDeltaList.innerHTML = "";
      this.converterList.innerHTML = "";
      for (const [resource, amount] of resourceDeltas.getEntries()) {
        const el = this.resourceDeltaTemplate.cloneElement();
        el.querySelector(".resource-name").innerText = resource.getDisplayName();
        el.querySelector(".resource-image").src = resource.getDisplayImage();
        el.querySelector(".resource-amount").innerText = (amount.greaterThan(Rational.zero) ? "+" : "") + amount.getDecimalString();
        el.querySelector(".resource-delta-unit").innerText = getUnits(resource.getUnitGroupName())[1];
        if (amount.lessThan(Rational.zero)) {
          el.classList.add("negative-resource-delta");
          el.classList.add("red");
          el.classList.add("interactive");
          el.onclick = () => this.converterRequestTarget?.requestConverterForResource(
            resource,
            amount
          );
        }
        this.resourceDeltaList.appendChild(el);
      }
      for (const [converter, number] of this.converters.getEntries()) {
        const el = this.converterTemplate.clone();
        el.querySelector(".converter-name").innerText = converter.getDisplayName();
        el.querySelector(".converter-image").src = converter.getDisplayImage();
        el.querySelector(".converter-decimal-approx").innerText = number.getDecimalString();
        const amountEl = el.querySelector(".converter-amount");
        amountEl.value = number.getMixedFractionString();
        amountEl.onchange = (e) => {
          const el2 = e.target;
          const amount = Rational.fromInput(el2.value, el2);
          if (amount) this.setConverterAmount(converter, amount);
        };
        el.querySelector(".remove-converter-button").onclick = () => this.removeConverter(converter);
        this.converterList.appendChild(el);
      }
    }
    addConverter(converter, amount) {
      this.converters.add(converter, amount);
      this.requiresRecalculation = true;
    }
    removeConverter(converter) {
      this.converters.remove(converter);
      this.requiresRecalculation = true;
    }
    setConverterAmount(converter, count) {
      this.converters.set(converter, count);
      this.requiresRecalculation = true;
    }
  };
  function requestGraphUpdate(graph) {
    requestAnimationFrame(() => requestGraphUpdate(graph));
    try {
      graph.recalculateIfNeeded();
    } catch (e) {
      displayErr(e);
      throw e;
    }
  }

  // scripts/submitMenu.ts
  var SubmitMenu = class _SubmitMenu {
    static tagListTemplate = new Template("tag-list-template");
    static thumbTemplate = new Template("item-converter-thumb");
    graph;
    menuElement;
    detailPopup;
    headerElement;
    thumbList;
    filterForm;
    submissionForm;
    infoPanel;
    showOnOpen;
    isOpen = false;
    detailIsOpen = false;
    constructor(graph, menuElement, detailPopup, headerElement, thumbList, filterForm, submissionForm, infoPanel, showOnOpen, openButton, closeButton, closeDetailButton) {
      this.graph = graph;
      this.menuElement = menuElement;
      this.detailPopup = detailPopup;
      this.headerElement = headerElement;
      this.thumbList = thumbList;
      this.filterForm = filterForm;
      this.submissionForm = submissionForm;
      this.infoPanel = infoPanel;
      this.showOnOpen = showOnOpen;
      submissionForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
          this.onSubmit();
        } catch (e2) {
          displayErr(e2);
          throw e2;
        }
      };
      filterForm.onsubmit = (e) => {
        e.preventDefault();
        this.applyCurrentFilters();
      };
      for (const el of filterForm.getElementsByTagName("input")) {
        el.oninput = () => {
          filterForm.requestSubmit();
        };
      }
      openButton.onclick = () => this.open();
      closeButton.onclick = () => this.close();
      closeDetailButton.onclick = () => this.closeDetailPopup();
      this.clearFilters();
    }
    open() {
      this.applyCurrentFilters();
      this.filterForm.reset();
      this.menuElement.classList.remove("hidden");
      this.headerElement.classList.remove("hidden");
      this.filterForm.classList.remove("hidden");
      this.submissionForm.classList.remove("hidden");
      this.isOpen = true;
    }
    close() {
      this.closeDetailPopup();
      this.clearFilters();
      this.menuElement.classList.add("hidden");
      this.headerElement.classList.add("hidden");
      this.filterForm.classList.add("hidden");
      this.submissionForm.classList.add("hidden");
      this.infoPanel.innerHTML = "";
      this.isOpen = false;
    }
    openDetailPopup() {
      this.submissionForm.reset();
      this.detailPopup.classList.remove("hidden");
      this.detailIsOpen = true;
    }
    closeDetailPopup() {
      this.detailPopup.classList.add("hidden");
      this.detailIsOpen = false;
    }
    addThumbToTagLists(tags, tagListMap, thumbData) {
      for (const tagName of tags) {
        if (tagName.startsWith("&")) return;
        const tagList = _SubmitMenu.createTagListIfNotExists(
          tagListMap,
          tagName,
          this.thumbList
        );
        const thumb = _SubmitMenu.createThumb(
          thumbData.name,
          thumbData.image,
          thumbData.onclick
        );
        _SubmitMenu.insertAlphabetical(
          tagList.querySelector(".tag-list-content"),
          thumb,
          ".thumb-name"
        );
      }
    }
    static createTagListIfNotExists(map, name, tagListContainer) {
      if (map.has(name)) return map.get(name);
      const tagList = _SubmitMenu.tagListTemplate.cloneElement();
      tagList.querySelector(".tag-list-name").innerText = name;
      tagList.querySelector("button").onclick = () => tagList.querySelector(".tag-list-content").classList.toggle("hidden");
      if (tagListContainer) {
        this.insertAlphabetical(tagListContainer, tagList, ".tag-list-name");
      }
      map.set(name, tagList);
      return tagList;
    }
    static insertAlphabetical(container, element, textSelector) {
      const name = element.querySelector(textSelector).innerText;
      const children = container.children;
      for (let i = 0; i <= children.length; i++) {
        const c = children[i];
        const insertHere = c ? name < c.querySelector(textSelector).innerText : true;
        if (insertHere) {
          container.insertBefore(element, c);
          break;
        }
      }
    }
    static createThumb(name, image, onclick) {
      const thumb = _SubmitMenu.thumbTemplate.cloneElement();
      thumb.querySelector(".thumb-name").innerText = name;
      thumb.querySelector("img.thumb-image").src = image;
      thumb.onclick = onclick;
      return thumb;
    }
    handleEscapePress() {
      if (!this.isOpen) return;
      if (this.detailIsOpen) {
        this.closeDetailPopup();
        return;
      }
      this.close();
    }
  };

  // scripts/converterMenu.ts
  var ConverterMenu = class extends SubmitMenu {
    amountInput;
    resourceBeingRequested = null;
    amountOfResourceBeingRequested = Rational.zero;
    searchString = "";
    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    intermediateConverter = null;
    converterSettingsForm;
    constructor(graph, menuElement, detailPopup, headerElement, thumbList, filterForm, converterForm, converterSettingsForm, amountInput, infoPanel, showOnOpen, openButton, closeButton, closeDetailButton) {
      super(
        graph,
        menuElement,
        detailPopup,
        headerElement,
        thumbList,
        filterForm,
        converterForm,
        infoPanel,
        showOnOpen,
        openButton,
        closeButton,
        closeDetailButton
      );
      this.amountInput = amountInput;
      this.converterSettingsForm = converterSettingsForm;
    }
    onSubmit() {
      if (!this.intermediateConverter) return;
      const converter = this.intermediateConverter.finalize();
      const amount = this.getAmountToProduce(
        converter,
        this.submissionForm.querySelector(
          "input[name=amount]"
        )
      );
      if (!amount) {
        throw new UserError(
          "Entered an invalid number! Please write a rational or floating-point number"
        );
      }
      if (!amount.equals(Rational.zero)) {
        this.graph.addConverter(converter, amount);
      }
      this.close();
    }
    getAmountToProduce(converter, input) {
      if (this.resourceBeingRequested) {
        return converter.getAmountToProduce(
          this.resourceBeingRequested,
          this.amountOfResourceBeingRequested
        );
      }
      const amount = Rational.fromInput(input.value, input);
      if (amount) {
        input.classList.add("input-invalic-amount");
        return amount;
      }
      return null;
    }
    // Note: Does not apply changes!
    clearFilters() {
      this.filterForm.querySelector(
        "input[name=search-string]"
      ).value = "";
      this.resourceBeingRequested = null;
      this.amountOfResourceBeingRequested = Rational.zero;
    }
    applyCurrentFilters() {
      this.thumbList.innerHTML = "";
      const formData = new FormData(this.filterForm);
      this.searchString = String(formData.get("search-string").valueOf());
      const converterList = getConverterFactoriesWithFilters(
        this.searchString,
        this.resourceBeingRequested ? [this.resourceBeingRequested] : [],
        []
      );
      if (converterList.length === 0) {
        this.thumbList.innerText = "No Results";
      }
      const tagLists = /* @__PURE__ */ new Map();
      const miscTag = SubmitMenu.createTagListIfNotExists(
        tagLists,
        "Miscellaneous",
        null
      );
      for (const [_, cFact] of converterList) {
        const tags = cFact.tags.length > 0 ? cFact.tags : ["Miscellaneous"];
        let onclickFn = () => {
          this.intermediateConverter = cFact.factory();
          this.infoPanel.innerHTML = "";
          this.intermediateConverter.tryPopulateInfoPanel();
          this.openDetailPopup();
        };
        this.addThumbToTagLists(tags, tagLists, {
          name: cFact.name,
          image: cFact.image,
          onclick: onclickFn
        });
      }
      if (miscTag.querySelector(".tag-list-content").children.length > 0)
        this.thumbList.appendChild(miscTag);
    }
    open() {
      super.open();
    }
    close() {
      super.close();
      this.intermediateConverter = null;
      this.converterSettingsForm.innerHTML = "";
      this.amountInput.classList.remove("hidden");
    }
    // Request the user to choose a converter that produces the given amount of the
    // given resource
    requestConverterForResource(resource, amount) {
      this.resourceBeingRequested = resource;
      this.amountOfResourceBeingRequested = amount;
      this.amountInput.classList.add("hidden");
      this.open();
      this.applyCurrentFilters();
    }
  };

  // scripts/resourceMenu.ts
  var ResourceMenu = class extends SubmitMenu {
    searchString = "";
    unitDropdown;
    constructor(graph, menuElement, detailPopup, headerElement, thumbList, filterForm, converterForm, unitDropdown, infoPanel, showOnOpen, openButton, closeButton, closeDetailButton) {
      super(
        graph,
        menuElement,
        detailPopup,
        headerElement,
        thumbList,
        filterForm,
        converterForm,
        infoPanel,
        showOnOpen,
        openButton,
        closeButton,
        closeDetailButton
      );
      this.unitDropdown = unitDropdown;
    }
    // To match with ConverterMenu, I'm also storing the resource to be added here instead of as a text input
    resourceToBeAdded = null;
    // Submit the form
    onSubmit() {
      if (!this.resourceToBeAdded) return;
      const resource = this.resourceToBeAdded;
      const el = this.submissionForm.querySelector(
        "input[name=delta]"
      );
      const delta = convertUnit(
        resource.getUnitGroupName(),
        Rational.fromInput(el.value, el) ?? Rational.zero,
        this.unitDropdown.selectedOptions[0].innerText
      );
      if (!delta) {
        throw new UserError(
          "Bad formatting, the amount needs to be a rational number!"
        );
      }
      if (!delta?.equals(Rational.zero)) {
        const itemList = [{ resource, amount: Rational.one }];
        const positiveDelta = delta.greaterThan(Rational.zero);
        const conv = new Converter(
          `Resource ${positiveDelta ? "source" : "drain"}: ${resource.getDisplayName()}`,
          resource.getDisplayImage(),
          // Put the item either as an ingredient or a product, depending on
          // whether this is a producer or consumer
          !positiveDelta ? itemList : [],
          positiveDelta ? itemList : []
        );
        this.graph.addConverter(conv, delta.abs());
      }
      this.close();
    }
    clearFilters() {
      this.filterForm.querySelector(
        "input[name=search-string]"
      ).value = "";
    }
    applyCurrentFilters() {
      this.thumbList.innerHTML = "";
      const formData = new FormData(this.filterForm);
      this.searchString = String(formData.get("search-string").valueOf());
      const resourceList = getResourcesWithFilter(this.searchString);
      const tagLists = /* @__PURE__ */ new Map();
      const miscTag = SubmitMenu.createTagListIfNotExists(
        tagLists,
        "Miscellaneous",
        null
      );
      for (const [, r] of resourceList) {
        let tags = r.getTags();
        tags = tags.length > 0 ? tags : ["Miscellaneous"];
        const onclickFn = () => {
          this.resourceToBeAdded = r;
          this.infoPanel.innerHTML = "";
          r.populateInfoPanel(this.infoPanel);
          populateUnitDropdown(this.unitDropdown, r.getUnitGroupName());
          this.openDetailPopup();
        };
        this.addThumbToTagLists(tags, tagLists, {
          name: r.getDisplayName(),
          image: r.getDisplayImage(),
          onclick: onclickFn
        });
      }
      if (miscTag.querySelector(".tag-list-content").children.length > 0)
        this.thumbList.appendChild(miscTag);
    }
    close() {
      this.resourceToBeAdded = null;
      super.close();
    }
  };

  // index.ts
  (async () => {
    window.onhashchange = () => {
      window.location.reload();
    };
    const loadingScreen = document.querySelector("#loading-screen");
    const loadingText = loadingScreen.querySelector("p");
    try {
      const resourceDeltaList = document.querySelector(
        "#resources"
      );
      const converterList = document.querySelector("#converters");
      const resourceDeltaTemplate = new Template("resource-delta-template");
      const converterTemplate = new Template("converter-template");
      loadingText.innerText = "Loading files...";
      const confRes = await fetch(
        `/data/${window.location.hash.replace(/^#/, "")}/config.json`
      );
      if (!confRes.ok) {
        throw new GraphError("Config not found!");
      }
      const config = await confRes.json();
      document.querySelector(
        "#personal-legal-disclaimer"
      ).innerText = config.legalDisclaimer;
      loadUnitGroups(config.unitGroups, config.defaultUnitGroup);
      await loadAllResources();
      await loadAllConverters();
      loadingText.innerText = "Constructing class instances...";
      const graph = new ResourceGraph(
        resourceDeltaList,
        converterList,
        resourceDeltaTemplate,
        converterTemplate
      );
      const addRcMenuWrapper = document.querySelector(
        "#add-rc-menu-wrapper"
      );
      const detailPopup = document.querySelector("#rc-detail-popup");
      const thumbList = document.querySelector("#add-rc-tag-list");
      const infoPanel = document.querySelector("#rc-info-panel");
      const rHeader = addRcMenuWrapper.querySelector(
        "#add-resource-header"
      );
      const rUnitDropdown = document.querySelector(
        "select#resource-unit-select"
      );
      const rFilter = document.querySelector(
        "form#resource-filter-form"
      );
      const rSubmit = document.querySelector(
        "form#resource-submission-form"
      );
      const resourceMenu = new ResourceMenu(
        graph,
        addRcMenuWrapper,
        detailPopup,
        rHeader,
        thumbList,
        rFilter,
        rSubmit,
        rUnitDropdown,
        infoPanel,
        rSubmit,
        // For now, this only hides the submission form. If I for some
        // reason need to hide more, this is what to change
        document.querySelector("#open-item-delta-menu-button"),
        document.querySelector("#close-resource-menu-button"),
        document.querySelector("#close-item-popup-button")
      );
      const cHeader = addRcMenuWrapper.querySelector(
        "#add-converter-header"
      );
      const cFilter = document.querySelector(
        "form#converter-filter-form"
      );
      const cSettings = document.querySelector(
        "#converter-settings-form"
      );
      const cSubmit = document.querySelector(
        "form#converter-submission-form"
      );
      const cSubmitAmount = document.querySelector(
        "#converter-amount-input"
      );
      const cFormWrapper = document.querySelector(
        "#converter-specific-footer"
      );
      const converterMenu = new ConverterMenu(
        graph,
        addRcMenuWrapper,
        detailPopup,
        cHeader,
        thumbList,
        cFilter,
        cSubmit,
        cSettings,
        cSubmitAmount,
        infoPanel,
        cFormWrapper,
        document.querySelector("#open-converter-menu-button"),
        document.querySelector("#close-converter-menu-button"),
        document.querySelector("#close-converter-popup-button")
      );
      loadingText.innerText = "Setting event listeners...";
      document.onkeydown = (e) => {
        if (e.code === "Escape") {
          converterMenu.handleEscapePress();
          resourceMenu.handleEscapePress();
        }
      };
      graph.setConverterRequestTarget(converterMenu);
      loadingScreen.remove();
    } catch (e) {
      displayErr(e);
      loadingText.innerText = "Error encountered during loading";
    }
  })();
})();
