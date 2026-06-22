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
    } else {
      alert(`SCRIPT ERROR: ${e.message}

Please report this as a bug!`);
    }
    throw e;
  }

  // scripts/rational.ts
  var Rational = class _Rational {
    // Split "a b/c", "a", "a/b", "a.b" or "a.b c/d", or any negations of these, into
    // the correct groups
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
    // Convert a [number, number] list to a rational
    static fromData(data) {
      console.log(data);
      if (typeof data === "number") return new _Rational(data, 1);
      if (Array.isArray(data)) return new _Rational(data[0], data[1]);
      throw new GraphError(`Incorrect type "${typeof data}" for rational number!`);
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
      } else if (v.equals(_Rational.one)) {
        return this;
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
    // Raise this number to another number
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
    // Negate this number
    negate() {
      return new _Rational(-this.numerator, this.denominator);
    }
    // Get the absolute value of this
    abs() {
      if (this.denominator < 0 === this.numerator < 0) return this;
      return new _Rational(Math.abs(this.numerator), Math.abs(this.denominator));
    }
    // Clamp between two values. Equal to median([lo, hi, this]), except that's not
    // implemented (yet?)
    clamp(lo, hi) {
      if (this.lessThan(lo)) return lo;
      if (this.greaterThan(hi)) return hi;
      return this;
    }
    floor() {
      if (this.denominator === 1) return this;
      const approximateResult = Math.floor(this.numerator / this.denominator);
      for (const v of [
        approximateResult + 1,
        approximateResult,
        approximateResult - 1
      ]) {
        if (v * this.denominator <= this.numerator && this.numerator < (v + 1) * this.denominator)
          return new _Rational(v);
      }
      return new _Rational(approximateResult);
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
    // Get as a mixed fraction of the form "whole num/den"
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
    static makeInputElement(name, unit, onchange) {
      const settingEl = _ConverterSetting.settingInputTemplate.clone();
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("input");
      const post = settingEl.querySelector("span");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      post.innerText = unit ?? "";
      input.onchange = onchange;
      return [settingEl, label, input];
    }
    static makeSelectElement(name, onchange) {
      const settingEl = _ConverterSetting.settingSelectTemplate.clone();
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("select");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      input.onchange = onchange;
      return [settingEl, label, input];
    }
  };

  // scripts/converter-setting/converterEnumerateSetting.ts
  var ConverterEnumerateSetting = class extends ConverterSetting {
    selectElement;
    constructor(name, defaultOption, options, onchange) {
      const [settingEl, , select] = ConverterSetting.makeSelectElement(
        name,
        onchange
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
    getChosenOption() {
      return this.selectElement.value;
    }
  };

  // scripts/converter-setting/converterNumberSetting.ts
  var ConverterNumberSetting = class extends ConverterSetting {
    inputElement;
    constructor(name, defaultValue, unit, onchange) {
      const [settingEl, , input] = ConverterSetting.makeInputElement(
        name,
        unit,
        onchange
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
    constructor(name, defaultValue, onchange) {
      const [settingEl, , input] = ConverterSetting.makeInputElement(
        name,
        "",
        onchange
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
    settings;
    onchange;
    constructor(settings, onchange) {
      this.onchange = onchange;
      this.settings = [];
      for (const data of settings) {
        const setting = _ConverterSettings.makeSettingInstance(
          data,
          this.onchange
        );
        this.settings.push(setting);
        this.settingsLookup.set(data.name, setting);
      }
    }
    populateForm(formEl) {
      formEl.innerHTML = "";
      for (const setting of this.settings) {
        formEl.appendChild(setting.getElement());
      }
    }
    static makeSettingInstance(data, onchange) {
      switch (data.type) {
        case "NUMBER":
          return new ConverterNumberSetting(
            data.name,
            Rational.fromData(data.default),
            data.unit ?? null,
            onchange
          );
        case "TOGGLE":
          return new ConverterToggleSetting(data.name, data.default, onchange);
        case "ENUMERATE":
          return new ConverterEnumerateSetting(
            data.name,
            data.default,
            data.options,
            onchange
          );
      }
    }
    getBranch(node) {
      const setting = this.settingsLookup.get(node.name);
      if (!setting) throw new GraphError(`Setting ${node.name} doesn't exist!`);
      return setting.chooseBranch(node);
    }
    getSetting(name) {
      return this.settingsLookup.get(name) ?? null;
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
    evaluateTree(treeNode) {
      if (typeof treeNode === "number" || Array.isArray(treeNode))
        return Rational.fromData(treeNode);
      switch (treeNode.type) {
        case "SETTING":
          return this.evaluateTree(this.getBranch(treeNode));
        case "MUL":
          let p = Rational.one;
          for (const child of treeNode.values)
            p = p.mul(this.evaluateTree(child));
          return p;
        case "DIV":
          return this.evaluateTree(treeNode.value1).div(
            this.evaluateTree(treeNode.value2)
          );
        case "ADD":
          let s = Rational.zero;
          for (const child of treeNode.values)
            s = s.add(this.evaluateTree(child));
          return s;
        case "SUB":
          return this.evaluateTree(treeNode.value1).sub(
            this.evaluateTree(treeNode.value2)
          );
        case "POW":
          return this.evaluateTree(treeNode.value1).pow(
            this.evaluateTree(treeNode.value2)
          );
        case "CLAMP": {
          const lo = this.evaluateTree(treeNode.low);
          const hi = this.evaluateTree(treeNode.high);
          const v = this.evaluateTree(treeNode.value);
          return v.clamp(lo, hi);
        }
        case "FLOOR": {
          const v = this.evaluateTree(treeNode.value);
          return v.floor();
        }
        case "THRESHOLD": {
          const v = this.evaluateTree(treeNode.value);
          const comp = this.evaluateTree(treeNode.threshold);
          if (v.lessThan(comp)) {
            return this.evaluateTree(treeNode.lower);
          } else {
            return this.evaluateTree(treeNode.higherOrEqual);
          }
        }
        default:
          throw new GraphError(
            `Unknown settings AST node type: ${treeNode.type}!`
          );
      }
    }
  };

  // scripts/intermediateConverter.ts
  var IntermediateConverter = class _IntermediateConverter {
    displayName;
    // Stored unformatted
    thumbName;
    displayImage;
    settings;
    // Lists of all entangled OR nodes linked with this converter, grouped by their
    // name
    // (in most cases there'll only be a single group, but I wanted to support more)
    entangledOrs = /* @__PURE__ */ new Map();
    // todo: back to private after debugging
    infoElement;
    // Ingredients and products
    ingredientTree;
    productTree;
    static infoTemplate = new Template("converter-info-template");
    static infoPanel = document.querySelector("#rc-info-panel");
    // note: overrides any current content of the info panel!
    constructor(displayName, thumbName, displayImage, settingList, ingredientTree, productTree) {
      this.displayName = displayName;
      this.thumbName = thumbName;
      this.displayImage = displayImage;
      this.ingredientTree = resourceTreeDataToClass(this, ingredientTree);
      this.productTree = resourceTreeDataToClass(this, productTree);
      this.settings = new ConverterSettings(settingList, (e) => {
        e.preventDefault();
        this.tryUpdateInfoPanel();
      });
      this.infoElement = _IntermediateConverter.infoTemplate.cloneElement();
      this.infoElement.querySelector(".c-info-ingredients").appendChild(this.ingredientTree.element);
      this.infoElement.querySelector(".c-info-products").appendChild(this.productTree.element);
      this.updateInfoPanel();
      this.infoElement.querySelector(".rc-info-image").src = this.displayImage;
      _IntermediateConverter.infoPanel.replaceChildren(this.infoElement);
    }
    formatDisplayName() {
      return this.settings.parseFormattedString(this.displayName);
    }
    // Returns a finalized converter, provided that all ambiguities are resolved
    makeConverter(ingr, prod) {
      return new Converter(
        this.formatDisplayName(),
        this.displayImage,
        ingr,
        prod
      );
    }
    addIngredientsToList(ingredientList, converterDependencyList) {
      return this.ingredientTree.addResourcesToList(
        ingredientList,
        converterDependencyList,
        this.settings,
        Rational.one
      );
    }
    addProductsToList(ingredientList) {
      const depList = [];
      const l = this.productTree.addResourcesToList(
        ingredientList,
        depList,
        this.settings,
        Rational.one
      );
      if (depList.length !== 0)
        throw new GraphError(
          `${this.thumbName} contains a "CONVERTER" node in the output tree, which is not allowed at this time!`
        );
      return l;
    }
    tryUpdateInfoPanel() {
      try {
        this.updateInfoPanel();
      } catch (e) {
        displayErr(e);
        throw e;
      }
    }
    // Update the info display with new settings
    updateInfoPanel() {
      this.ingredientTree.updateElement(Rational.one, this.settings);
      this.productTree.updateElement(Rational.one, this.settings);
      this.infoElement.querySelector(".rc-info-header").innerText = this.formatDisplayName();
    }
    registerEntangledOr(name, node) {
      if (!this.entangledOrs.has(name)) this.entangledOrs.set(name, []);
      this.entangledOrs.get(name).push(node);
    }
    unregisterEntangledOr(name, node) {
      const list = this.entangledOrs.get(name);
      if (!list)
        throw new ProgramError(
          `No entangled ORs with name ${name} present on this intermediate converter!`
        );
      for (let i = 0; i < list.length; i++) {
        if (list[i] === node) {
          list.splice(i, 1);
          return;
        }
      }
      throw new ProgramError(
        `Tried to remove entangled OR with name ${name}, but it wasn't registered on the converter!`
      );
    }
    collapseEntangledOrs(entangledOrName, optionName) {
      const ors = this.entangledOrs.get(entangledOrName);
      if (!ors) return;
      for (const node of ors) node.chooseOption(optionName);
    }
  };

  // scripts/converterFactory.ts
  var ConverterFactory = class _ConverterFactory {
    displayName;
    thumbName;
    displayImage;
    ingredientTreeData;
    productTreeData;
    settings;
    // Used for filtering
    tags;
    possibleIngredients = [];
    possibleProducts = [];
    constructor(displayName, thumbName, displayImage, tags, settings, ingredientTreeData, productTreeData) {
      this.displayName = displayName;
      this.thumbName = thumbName;
      this.displayImage = displayImage;
      this.tags = tags;
      this.settings = settings;
      this.ingredientTreeData = ingredientTreeData;
      this.productTreeData = productTreeData;
      _ConverterFactory.getAllPossibleResources(
        ingredientTreeData,
        this.possibleIngredients
      );
      _ConverterFactory.getAllPossibleResources(
        productTreeData,
        this.possibleProducts
      );
    }
    factory() {
      try {
        return new IntermediateConverter(
          this.displayName,
          this.thumbName,
          this.displayImage,
          this.settings ?? [],
          this.ingredientTreeData,
          this.productTreeData
        );
      } catch (e) {
        displayErr(e);
        throw e;
      }
    }
    static getAllPossibleResources(data, output) {
      switch (data.type) {
        case "RESOURCE":
          output.push(getResource(data.id));
          return output;
        case "CONVERTER":
          return output;
        // Does not recursively search through converters :cry:
        case "AND":
        case "OR":
          data.resources.map((el) => this.getAllPossibleResources(el, output));
          return output;
        case "MULTIPLIER":
          return this.getAllPossibleResources(data.resource, output);
        case "TAG":
          if (!data.tagName)
            throw new GraphError(
              "A TAG node is missing its tagName attribute!"
            );
          const resources = getResourcesWithTags(data.tagName);
          for (const [, r] of resources) output.push(r);
          return output;
        case "ENTANGLED_OR":
          data.resources.map(
            ([, r]) => this.getAllPossibleResources(r, output)
          );
          return output;
        case "BRANCH":
          data.branches.map(
            ([, r]) => this.getAllPossibleResources(r, output)
          );
          return output;
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
    getTags() {
      return [...this.tags];
    }
    // (assumes an empty info panel element)
    populateInfoPanel(panel) {
      const el = _Resource.infoTemplate.clone();
      el.querySelector(".rc-info-header").innerText = this.displayName;
      el.querySelector(".rc-info-image").src = this.displayImage;
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
          this.children[i].element.replaceWith(newChild.element);
          this.children[i] = newChild;
          return;
        }
      }
      throw new ProgramError(
        "Child not found in boolean node when trying to replace it!"
      );
    }
    updateElement(multiplier, settings) {
      this.children.map((child) => child.updateElement(multiplier, settings));
    }
  };

  // scripts/resource-tree/andNode.ts
  var AndNode = class extends ResourceTreeBoolNode {
    element;
    constructor(children) {
      super(children);
      const andEl = document.createElement("div");
      andEl.classList.add("converter-child-list");
      this.children.map((child) => andEl.appendChild(child.element));
      this.element = andEl;
    }
    addResourcesToList(output, converterDependencies, settings, multiplier = Rational.one) {
      this.children.map(
        (c) => c.addResourcesToList(
          output,
          converterDependencies,
          settings,
          multiplier
        )
      );
      return output;
    }
  };

  // scripts/resource-tree/branchNode.ts
  var BranchNode = class {
    element;
    settingName;
    childMap = /* @__PURE__ */ new Map();
    currentBranch = null;
    constructor(settingName, children) {
      this.element = document.createElement("div");
      this.element.classList.toggle("test-class");
      this.settingName = settingName;
      children.map(([name, child]) => {
        this.element.appendChild(child.element);
        child.element.classList.add("hidden");
        if (typeof name === "string") this.childMap.set(name, child);
        else name.map((n) => this.childMap.set(n, child));
      });
    }
    addResourcesToList(output, converterDependencies, settings, multiplier = Rational.one) {
      const branch = this.getBranch(settings);
      return branch.addResourcesToList(
        output,
        converterDependencies,
        settings,
        multiplier
      );
    }
    updateElement(multiplier, settings) {
      for (const [, value] of this.childMap.entries()) {
        value.updateElement(multiplier, settings);
      }
      this.currentBranch?.element.classList.add("hidden");
      const branch = this.getBranch(settings);
      branch.element.classList.remove("hidden");
      this.currentBranch = branch;
    }
    getBranch(settings) {
      const setting = settings.getSetting(this.settingName);
      if (!setting)
        throw new GraphError(
          `Setting "${this.settingName}" not found on converter!`
        );
      if (!(setting instanceof ConverterEnumerateSetting)) {
        throw new GraphError(
          `The setting "${this.settingName}" isn't of type ENUMERATE, and can't be used in BRANCH nodes!`
        );
      }
      const chosenBranchName = setting.getChosenOption();
      const branch = this.childMap.get(chosenBranchName);
      if (!branch) {
        throw new GraphError(
          `A BRANCH node is missing a branch associated with the string "${chosenBranchName}"!`
        );
      }
      return branch;
    }
  };

  // scripts/resource-tree/converterNode.ts
  var ConverterNode = class _ConverterNode {
    amount;
    converter;
    element;
    // Template for a resource element
    static converterIngredientTemplate = new Template(
      "converter-ingredient-template"
    );
    constructor(converterFactory, amount) {
      this.amount = amount;
      this.converter = converterFactory;
      this.element = this.createIngredientElement();
      this.setAmount(Rational.one);
    }
    updateElement(_multiplier, _settings) {
    }
    setAmount(amount) {
      this.element.querySelector(
        ".converter-ingredient-amount"
      ).innerText = amount.getDecimalString();
    }
    addResourcesToList(output, converterDependencies, _settings, multiplier = Rational.one) {
      converterDependencies.push({
        converter: this.converter,
        amount: { type: "MUL", values: [multiplier.getList(), this.amount] }
      });
      return output;
    }
    createIngredientElement() {
      const el = _ConverterNode.converterIngredientTemplate.cloneElement();
      el.querySelector(".converter-ingredient-name").innerText = this.converter.displayName;
      el.querySelector(".converter-ingredient-image").src = this.converter.displayImage;
      return el;
    }
  };

  // scripts/resource-tree/orNode.ts
  var OrNode = class _OrNode extends ResourceTreeBoolNode {
    thisElement;
    get element() {
      if (this.chosenOption) return this.chosenOption.element;
      return this.thisElement;
    }
    chosenOption = null;
    // Keeps a map of all the current options, to avoid having to redo the onclick
    // for option divs when an option changes due to being collapsed
    optionNameToTreeMap = /* @__PURE__ */ new Map();
    // Element representing an option
    static converterSelectTemplate = new Template(
      "converter-select-template"
    );
    // Element for containing an option
    static converterOptionTemplate = new Template(
      "converter-option-template"
    );
    // Element inbetween options that just says "OR"
    static converterOrTemplate = new Template("converter-or-template");
    // (the options list is a list of name/option pairs)
    constructor(options) {
      super(options.map(([, r]) => r));
      this.thisElement = _OrNode.converterSelectTemplate.cloneElement();
      const selectList = this.element.querySelector(
        ".converter-select-children"
      );
      let numOptions = 0;
      for (let i = 0; i < options.length; i++) {
        const optionName = options[i][0];
        const optionList = typeof optionName === "string" ? [optionName] : optionName;
        const option = this.children[i];
        for (const name of optionList) {
          this.optionNameToTreeMap.set(name, option);
          const optionWrapper = _OrNode.converterOptionTemplate.cloneElement();
          const clone = option.element.cloneNode(true);
          optionWrapper.appendChild(clone);
          optionWrapper.onclick = () => {
            try {
              this.chooseOption(name);
            } catch (e) {
              displayErr(e);
              throw e;
            }
          };
          selectList.appendChild(optionWrapper);
          numOptions++;
          selectList.appendChild(_OrNode.converterOrTemplate.clone());
        }
      }
      selectList.removeChild(selectList.children[selectList.children.length - 1]);
      this.element.querySelector(
        ".converter-select-count"
      ).innerText = String(numOptions);
    }
    // Choose the given option
    chooseOption(optionName) {
      const chosenOption = this.optionNameToTreeMap.get(optionName);
      if (!chosenOption)
        throw new ProgramError(
          `Option "${optionName}" not found in lookup when trying to collapse OR node!`
        );
      this.chosenOption = chosenOption;
      this.thisElement.replaceWith(chosenOption.element);
    }
    addResourcesToList(output, converterDependencies, settings, multiplier = Rational.one) {
      if (!this.chosenOption)
        throw new UserError(
          "All OR nodes aren't resolved, please choose an option!"
        );
      return this.chosenOption.addResourcesToList(
        output,
        converterDependencies,
        settings,
        multiplier
      );
    }
  };

  // scripts/resource-tree/entangledOr.ts
  var EntangledOrNode = class extends OrNode {
    // The ID of this converter
    name;
    // The converter that this entangled OR uses for communicating with other
    // entangled ORs
    converter;
    constructor(converter, name, options) {
      super(options);
      this.name = name;
      this.converter = converter;
      converter.registerEntangledOr(name, this);
    }
    // Override the collapseNode function so that when this node collapses, it also
    // collapses the others
    chooseOption(optionName) {
      this.converter.unregisterEntangledOr(this.name, this);
      super.chooseOption(optionName);
      this.converter.collapseEntangledOrs(this.name, optionName);
    }
  };

  // scripts/resource-tree/multiplierNode.ts
  var MultiplierNode = class {
    element;
    resource;
    multiplierAst;
    constructor(resource, multiplier) {
      this.multiplierAst = multiplier;
      this.resource = resource;
      this.element = document.createElement("div");
      this.element.appendChild(this.resource.element);
    }
    updateElement(multiplier, settings) {
      const newMultiplier = settings.evaluateTree(this.multiplierAst);
      multiplier = multiplier.mul(newMultiplier);
      if (multiplier.equals(Rational.zero)) {
        this.element.classList.add("hidden");
      } else {
        this.element.classList.remove("hidden");
        this.resource.updateElement(multiplier, settings);
      }
    }
    addResourcesToList(output, converterDependencies, settings, multiplier) {
      multiplier = multiplier.mul(settings.evaluateTree(this.multiplierAst));
      if (multiplier.equals(Rational.zero)) return output;
      this.resource.addResourcesToList(
        output,
        converterDependencies,
        settings,
        multiplier
      );
      return output;
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
    amount;
    resource;
    element;
    // Template for a resource element
    static converterIngredientTemplate = new Template(
      "converter-ingredient-template"
    );
    constructor(resource, amount) {
      this.amount = amount;
      this.resource = resource;
      this.element = this.createIngredientElement();
      this.setAmount(amount);
    }
    updateElement(multiplier, _) {
      this.setAmount(this.amount.mul(multiplier));
    }
    setAmount(amount) {
      const unitGroupName = this.resource.unitGroupName;
      this.element.querySelector(
        ".converter-ingredient-amount"
      ).innerText = `${amount.getDecimalString()} ${getUnits(unitGroupName)[1]}`;
    }
    addResourcesToList(output, _converterDependencies, _, multiplier = Rational.one) {
      output.push({
        resource: this.resource,
        amount: this.amount.mul(multiplier)
      });
      return output;
    }
    createIngredientElement() {
      const el = _ResourceNode.converterIngredientTemplate.cloneElement();
      el.querySelector(".converter-ingredient-name").innerText = this.resource.displayName;
      el.querySelector(".converter-ingredient-image").src = this.resource.displayImage;
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
      if (searchString && !r.displayName.toLowerCase().includes(searchString.toLowerCase()))
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
      const andWrappedIngr = andWrap(data.consumes);
      const andWrappedProd = andWrap(data.produces);
      loadedConverterFactories.set(
        data.id,
        new ConverterFactory(
          data.displayName,
          data.thumbName ?? data.displayName,
          getSrc(data.displayImage),
          data.tags ?? [],
          data.settings,
          andWrappedIngr,
          andWrappedProd
        )
      );
    }
  }
  function resourceTreeDataToClass(converter, data) {
    switch (data.type) {
      case "RESOURCE":
        return new ResourceNode(
          getResource(data.id),
          Rational.fromData(data.amount)
        );
      case "CONVERTER":
        const conFact = getConverterFactory(data.id);
        if (!conFact)
          throw new GraphError(
            `Couldn't find converter factory with id "${data.id}"!`
          );
        return new ConverterNode(conFact, data.amount);
      case "AND":
        return new AndNode(
          data.resources.map((c) => resourceTreeDataToClass(converter, c))
        );
      case "OR":
        if (!parent)
          throw new ProgramError(
            "An OR node can't be a root node, and something failed with the AND wrapping!"
          );
        const options = [];
        data.resources.map((childData) => preprocessOrInput(childData, options));
        return new OrNode(
          options.map((cData, cIndex) => [
            String(cIndex),
            resourceTreeDataToClass(converter, cData)
          ])
        );
      case "ENTANGLED_OR":
        if (!parent)
          throw new ProgramError(
            "An OR node can't be a root node, and something failed with the AND wrapping!"
          );
        return new EntangledOrNode(
          converter,
          data.id,
          data.resources.map(([cName, cData]) => [
            cName,
            resourceTreeDataToClass(converter, cData)
          ])
        );
      case "MULTIPLIER":
        return new MultiplierNode(
          resourceTreeDataToClass(converter, data.resource),
          data.multiplier
        );
      case "BRANCH":
        return new BranchNode(
          data.settingName,
          data.branches.map(([name, branch]) => [
            name,
            resourceTreeDataToClass(converter, branch)
          ])
        );
      case "TAG":
        if (!data.tagName)
          throw new ProgramError(
            `A TAG node is missing its "tagName" attribute!`
          );
        const resources = getResourcesWithTags(data.tagName);
        const resourceData = resources.map(
          ([id]) => makeResourceFromIdAndAmount(id, data.amount)
        );
        const orNode = {
          type: "OR",
          resources: resourceData
        };
        return resourceTreeDataToClass(converter, orNode);
    }
  }
  function preprocessOrInput(tree, output) {
    switch (tree.type) {
      case "RESOURCE":
      case "AND":
      case "OR":
      case "MULTIPLIER":
        output.push(tree);
        break;
      case "TAG":
        const resources = getResourcesWithTags(tree.tagName);
        for (const [id] of resources) {
          output.push({
            type: "RESOURCE",
            id,
            amount: tree.amount
          });
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
  function getConverterFactory(id) {
    return loadedConverterFactories.get(id);
  }
  function getConverterFactoriesWithFilters(searchString = "", anyResourceProduced = [], anyResourceConsumed = []) {
    const list = loadedConverterFactories.entries();
    const output = [];
    for (const [id, c] of list) {
      if (searchString && !c.thumbName.toLowerCase().includes(searchString.toLowerCase()))
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
        el.querySelector(".resource-name").innerText = resource.displayName;
        el.querySelector(".resource-image").src = resource.displayImage;
        el.querySelector(".resource-amount").innerText = (amount.greaterThan(Rational.zero) ? "+" : "") + amount.getDecimalString();
        el.querySelector(".resource-delta-unit").innerText = getUnits(resource.unitGroupName)[1];
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
        if (tagName.startsWith("&")) continue;
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
    dependencyPopup;
    resourceRequest = null;
    searchString = "";
    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    converterInProgress = null;
    converterSettingsForm;
    constructor(graph, menuElement, detailPopup, depdendencyPopup, headerElement, thumbList, filterForm, converterForm, converterSettingsForm, amountInput, infoPanel, showOnOpen, openButton, closeButton, closeDetailButton) {
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
      this.dependencyPopup = depdendencyPopup;
      this.amountInput = amountInput;
      this.converterSettingsForm = converterSettingsForm;
    }
    onSubmit() {
      if (!this.converterInProgress)
        throw new ProgramError(
          "Tried to submit converter form when no converter was being constructed!"
        );
      this.converterInProgress.converter.addIngredientsToList(
        this.converterInProgress.ingredients,
        this.converterInProgress.unresolvedDependencies
      );
      this.converterInProgress.converter.addProductsToList(
        this.converterInProgress.products
      );
      this.closeDetailPopup();
      this.resolveConverterDependency();
    }
    resolveConverterDependency() {
      if (!this.converterInProgress)
        throw new ProgramError(
          "Tried to resolve converter dependencies when no converter was being constructed!"
        );
      if (this.converterInProgress.unresolvedDependencies.length === 0) {
        this.finalizeConverter();
        this.close();
        return;
      }
      const dependency = this.converterInProgress.unresolvedDependencies.pop();
      this.openDependencyPopup();
      this.dependencyPopup.querySelector(
        "#converter-dependency-name"
      ).innerText = dependency.converter.thumbName;
      this.dependencyPopup.querySelector(
        "#converter-dependency-primary-name"
      ).innerText = this.converterInProgress.converter.thumbName;
      const ingredientTree = resourceTreeDataToClass(
        this.converterInProgress.converter,
        dependency.converter.ingredientTreeData
      );
      const dependencyAmountEl = this.dependencyPopup.querySelector(
        "#converter-dependency-amount"
      );
      const dependencySettings = new ConverterSettings(
        dependency.converter.settings,
        () => {
          const amount2 = dependencySettings.evaluateTree(dependency.amount);
          ingredientTree.updateElement(amount2, dependencySettings);
          dependencyAmountEl.innerText = amount2.getDecimalString();
        }
      );
      const amount = dependencySettings.evaluateTree(dependency.amount);
      ingredientTree.updateElement(amount, dependencySettings);
      dependencyAmountEl.innerText = amount.getDecimalString();
      dependencySettings.populateForm(
        this.dependencyPopup.querySelector(
          "#converter-dependency-settings-form"
        )
      );
      const treeContainer = this.dependencyPopup.querySelector(
        "#converter-dependency-tree"
      );
      treeContainer.innerHTML = "";
      treeContainer.appendChild(ingredientTree.element);
      const submitBtn = this.dependencyPopup.querySelector("#submit-depencency");
      submitBtn.onclick = () => {
        try {
          if (!this.converterInProgress)
            throw new ProgramError(
              "Tried to resolve a converter dependency while no converter was being constructed!"
            );
          ingredientTree.addResourcesToList(
            this.converterInProgress.ingredients,
            this.converterInProgress.unresolvedDependencies,
            dependencySettings,
            dependencySettings.evaluateTree(dependency.amount)
          );
          submitBtn.onclick = null;
          this.closeDependencyPopup();
          this.resolveConverterDependency();
        } catch (e) {
          displayErr(e);
          throw e;
        }
      };
    }
    finalizeConverter() {
      if (!this.converterInProgress)
        throw new ProgramError(
          "Tried to finalize converter dependencies when no converter was being constructed!"
        );
      const converter = this.converterInProgress.converter.makeConverter(
        this.converterInProgress.ingredients,
        this.converterInProgress.products
      );
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
    }
    getAmountToProduce(converter, input) {
      if (this.resourceRequest) {
        return converter.getAmountToProduce(
          this.resourceRequest.resource,
          this.resourceRequest.amount
        );
      }
      return Rational.fromInput(input.value, input);
    }
    // Note: Does not apply changes automatically!
    clearFilters() {
      this.filterForm.querySelector(
        "input[name=search-string]"
      ).value = "";
      this.resourceRequest = null;
    }
    applyCurrentFilters() {
      this.thumbList.innerHTML = "";
      const formData = new FormData(this.filterForm);
      this.searchString = String(formData.get("search-string").valueOf());
      const converterList = getConverterFactoriesWithFilters(
        this.searchString,
        this.resourceRequest ? [this.resourceRequest.resource] : [],
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
          this.converterInProgress = {
            converter: cFact.factory(),
            ingredients: [],
            products: [],
            unresolvedDependencies: []
          };
          this.converterInProgress.converter.settings.populateForm(
            this.converterSettingsForm
          );
          this.converterInProgress.converter.tryUpdateInfoPanel();
          this.closeDependencyPopup();
          this.openDetailPopup();
        };
        this.addThumbToTagLists(tags, tagLists, {
          name: cFact.thumbName,
          image: cFact.displayImage,
          onclick: onclickFn
        });
      }
      if (miscTag.querySelector(".tag-list-content").children.length > 0)
        this.thumbList.appendChild(miscTag);
    }
    openDependencyPopup() {
      this.dependencyPopup.classList.remove("hidden");
    }
    closeDependencyPopup() {
      this.dependencyPopup.classList.add("hidden");
    }
    open() {
      super.open();
    }
    close() {
      super.close();
      this.closeDependencyPopup();
      this.converterInProgress = null;
      this.converterSettingsForm.innerHTML = "";
      this.amountInput.classList.remove("hidden");
    }
    // Request the user to choose a converter that produces the given amount of the
    // given resource
    requestConverterForResource(resource, amount) {
      this.resourceRequest = { resource, amount };
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
        resource.unitGroupName,
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
          `Resource ${positiveDelta ? "source" : "drain"}: ${resource.displayName}`,
          resource.displayImage,
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
        let tags = [...r.getTags()];
        let shouldAddMisc = true;
        for (const t of tags) {
          if (!t.startsWith("&")) {
            shouldAddMisc = false;
            break;
          }
        }
        if (shouldAddMisc) {
          tags.push("Miscellaneous");
        }
        const onclickFn = () => {
          this.resourceToBeAdded = r;
          this.infoPanel.innerHTML = "";
          r.populateInfoPanel(this.infoPanel);
          populateUnitDropdown(this.unitDropdown, r.unitGroupName);
          this.openDetailPopup();
        };
        this.addThumbToTagLists(tags, tagLists, {
          name: r.displayName,
          image: r.displayImage,
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
      const cDepdendencyPopup = document.querySelector(
        "#converter-dependency-popup"
      );
      const converterMenu = new ConverterMenu(
        graph,
        addRcMenuWrapper,
        detailPopup,
        cDepdendencyPopup,
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
      loadingText.innerText = e.message;
      displayErr(e);
      throw e;
    }
  })();
})();
