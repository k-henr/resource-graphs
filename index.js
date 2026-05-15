(() => {
  // scripts/rational.ts
  var Rational = class _Rational {
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
      const matcher = /^ *(?<NEG>-)? *(?:(?<FULL>\d+(\.\d*)?))? +(?:(?<NUM>\d+) *\/ *(?<DEN>\d+))? *$/;
      const match = (" " + inputString + " ").match(matcher);
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
      if (!total.greaterThan(Rational.zero)) return Rational.zero;
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

  // scripts/converterSettings.ts
  var ConverterSettings = class {
    settingsLookup = /* @__PURE__ */ new Map();
    settingsOrder = [];
    // Parse an AST node and register all settings in it
    registerSettingsFromAst(astNode) {
      if (typeof astNode === "number" || Array.isArray(astNode)) return;
      switch (astNode.type) {
        case "NUMBER":
          this.registerSetting(astNode);
          return;
        case "TOGGLE":
          this.registerSetting(astNode);
          this.registerSettingsFromAst(astNode.true);
          this.registerSettingsFromAst(astNode.false);
          return;
        case "ENUMERATE":
          this.registerSetting(astNode);
          for (const [, option] of astNode.options) {
            this.registerSettingsFromAst(option);
          }
          return;
        case "MUL":
          for (const factor of astNode.factors)
            this.registerSettingsFromAst(factor);
          return;
        case "DIV":
          this.registerSettingsFromAst(astNode.numerator);
          this.registerSettingsFromAst(astNode.denominator);
          return;
        case "ADD":
          for (const term of astNode.terms) this.registerSettingsFromAst(term);
          return;
        case "SUB":
          this.registerSettingsFromAst(astNode.term1);
          this.registerSettingsFromAst(astNode.term2);
          return;
        case "POW":
          this.registerSettingsFromAst(astNode.base);
          this.registerSettingsFromAst(astNode.exponent);
          return;
      }
    }
    registerSetting(node) {
      if (this.settingsLookup.has(node.name)) {
        const prev = this.settingsLookup.get(node.name);
        if (node.type !== prev.type)
          throw new Error(
            `Mismatched type for converter setting ${node.name}`
          );
        if (node.type === "ENUMERATE") {
          if (prev.type !== "ENUMERATE") return;
          for (const [selector] of node.options) {
            let addOptionNameIfNew = function(name, options) {
              if (options.indexOf(name) === -1) options.push(name);
            };
            if (typeof selector === "string")
              addOptionNameIfNew(selector, prev.options);
            else
              for (const s of selector)
                addOptionNameIfNew(s, prev.options);
          }
        }
      } else {
        this.settingsOrder.push(node.name);
        this.settingsLookup.set(node.name, this.makeNewSettingObject(node));
      }
    }
    getSetting(name) {
      return this.settingsLookup.get(name);
    }
    // Construct a list of all settings that have been registered
    getAllSettings() {
      const output = [];
      for (const name of this.settingsOrder) {
        output.push([name, this.settingsLookup.get(name)]);
      }
      return output;
    }
    makeNewSettingObject(node) {
      switch (node.type) {
        case "NUMBER":
          return {
            type: "NUMBER",
            default: node.default
          };
        case "TOGGLE":
          return {
            type: "TOGGLE",
            default: node.default
          };
        case "ENUMERATE":
          const options = [];
          for (const [selector] of node.options) {
            if (typeof selector === "string") options.push(selector);
            else for (const s of selector) options.push(s);
          }
          return {
            type: "ENUMERATE",
            options,
            default: node.default
          };
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
    // Ingredients and products are always wrapped in an AND node. Split AND and OR
    // into two types to enforce this further?
    ingredients;
    products;
    static infoTemplate = document.querySelector(
      "#converter-info-template"
    );
    static converterIngredientTemplate = document.querySelector(
      "template#converter-ingredient-template"
    );
    static converterSelectTemplate = document.querySelector(
      "template#converter-select-template"
    );
    static converterOrTemplate = document.querySelector(
      "template#converter-or-template"
    );
    static infoPanel = document.querySelector("#rc-info-panel");
    static settingsForm = document.querySelector(
      "#converter-settings-form"
    );
    static settingInputTemplate = document.querySelector(
      "#converter-setting-input-template"
    );
    static settingSelectTemplate = document.querySelector(
      "#converter-setting-select-template"
    );
    constructor(displayName, thumbName, displayImage, ingredients, products) {
      this.displayName = displayName;
      this.thumbName = thumbName;
      this.displayImage = displayImage;
      this.ingredients = ingredients;
      this.products = products;
      _IntermediateConverter.settingsForm.innerHTML = "";
      this.settings = this.getAllConverterSettings(
        this.products,
        this.getAllConverterSettings(this.ingredients, new ConverterSettings())
      );
      for (const [name, setting] of this.settings.getAllSettings()) {
        const settingEl = this.createSettingInput(name, setting);
        _IntermediateConverter.settingsForm.appendChild(settingEl);
      }
    }
    getThumbName() {
      return this.thumbName;
    }
    getDisplayName() {
      const formData = new FormData(_IntermediateConverter.settingsForm);
      return this.displayName.replaceAll(
        /\{(.*?)\}/gim,
        (_, inner) => this.parseFormatting(inner, formData)
      );
    }
    getDisplayImage() {
      return this.displayImage;
    }
    // Returns a finalized converter, provided that all ambiguities are resolved
    finalize() {
      const ingr = this.resourceTreeToList(
        this.ingredients,
        [],
        _IntermediateConverter.settingsForm
      );
      const prod = this.resourceTreeToList(
        this.products,
        [],
        _IntermediateConverter.settingsForm
      );
      return new Converter(this.getDisplayName(), this.displayImage, ingr, prod);
    }
    // Populate an info panel with information regarding this converter
    // Assumes empty panel element!
    populateInfoPanel() {
      const el = _IntermediateConverter.infoTemplate.content.cloneNode(
        true
      );
      el.querySelector(".rc-info-header").innerText = this.getDisplayName();
      el.querySelector(".rc-info-image").src = getSrc(
        this.getDisplayImage()
      );
      console.log("Repopulating info panel, ingredients:", this.ingredients);
      this.addResourceTreeToElement(
        this.ingredients,
        null,
        el.querySelector(".c-info-ingredients"),
        _IntermediateConverter.settingsForm
      );
      this.addResourceTreeToElement(
        this.products,
        null,
        el.querySelector(".c-info-products"),
        _IntermediateConverter.settingsForm
      );
      _IntermediateConverter.infoPanel.appendChild(el);
    }
    // Replace a given string with the text it represents, given settings data
    parseFormatting(toFormat, formData) {
      console.log(toFormat);
      const args = toFormat.split("|");
      const settingName = args[0];
      const setting = this.settings.getSetting(settingName);
      if (!setting)
        throw new Error(`Formatting error: Setting "${settingName}" not found!`);
      switch (setting.type) {
        case "TOGGLE": {
          return formData.get(settingName) ? args[1] ?? "" : args[2] ?? "";
        }
        case "NUMBER": {
          const rational = Rational.fromInput(
            String(formData.get(settingName).valueOf()),
            null
          );
          if (!rational) return "???";
          return rational.getDecimalString();
        }
        case "ENUMERATE": {
          return String(formData.get(settingName).valueOf());
        }
      }
    }
    createSettingInput(name, setting) {
      switch (setting.type) {
        case "NUMBER": {
          const [settingEl, , input] = this.createInputElement(name);
          input.type = "text";
          input.value = String(setting.default ?? 0);
          return settingEl;
        }
        case "TOGGLE": {
          const [settingEl, , input] = this.createInputElement(name);
          input.type = "checkbox";
          input.checked = setting.default ?? false;
          return settingEl;
        }
        case "ENUMERATE": {
          const [settingEl, , select] = this.createSelectElement(name);
          for (const optionName of setting.options) {
            const optionEl = document.createElement("option");
            optionEl.value = optionName;
            optionEl.innerText = optionName;
            select.appendChild(optionEl);
            const defIndex = setting.options.indexOf(setting.default);
            select.selectedIndex = defIndex !== -1 ? defIndex : 0;
          }
          return settingEl;
        }
      }
    }
    createInputElement(name) {
      const settingEl = _IntermediateConverter.settingInputTemplate.content.cloneNode(
        true
      );
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("input");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      input.onchange = () => {
        _IntermediateConverter.infoPanel.innerHTML = "";
        this.populateInfoPanel();
      };
      return [settingEl, label, input];
    }
    createSelectElement(name) {
      const settingEl = _IntermediateConverter.settingSelectTemplate.content.cloneNode(
        true
      );
      const label = settingEl.querySelector("label");
      const input = settingEl.querySelector("select");
      label.htmlFor = name;
      label.innerText = name;
      input.name = name;
      input.onchange = () => {
        _IntermediateConverter.infoPanel.innerHTML = "";
        this.populateInfoPanel();
      };
      return [settingEl, label, input];
    }
    // Register all converter settings present in the given tree
    getAllConverterSettings(node, settings) {
      switch (node.type) {
        case "RESOURCE":
          return settings;
        case "AND":
        case "OR":
          for (const child of node.resources)
            this.getAllConverterSettings(child, settings);
          return settings;
        case "MULTIPLIER":
          settings.registerSettingsFromAst(node.multiplier);
          return settings;
      }
    }
    // (returns the newly created element)
    addResourceTreeToElement(node, parentContext, el, settingsForm, multiplier = Rational.one) {
      switch (node.type) {
        case "RESOURCE":
          const resEl = this.createIngredientElement(node, multiplier);
          el.appendChild(resEl);
          return resEl;
        case "AND":
          const andEl = document.createElement("div");
          node.resources.map((child, index) => {
            this.addResourceTreeToElement(
              child,
              { parent: node, index },
              andEl,
              settingsForm,
              multiplier
            );
          });
          el.appendChild(andEl);
          return andEl;
        case "OR":
          const selectEl = _IntermediateConverter.converterSelectTemplate.content.cloneNode(
            true
          ).firstElementChild;
          selectEl.querySelector(
            ".converter-select-count"
          ).innerText = String(node.resources.length);
          const selectList = selectEl.querySelector(
            ".converter-select-children"
          );
          for (let i = 0; i < node.resources.length; i++) {
            const res = node.resources[i];
            const option = this.addResourceTreeToElement(
              res,
              { parent: node, index: i },
              selectList,
              settingsForm,
              multiplier
            );
            option.onclick = () => {
              if (!parentContext)
                throw new Error("An OR node can't be a root node!");
              console.log(
                "Replacing OR node in parent context:",
                parentContext
              );
              if (parentContext.parent.type === "MULTIPLIER") {
                parentContext.parent.resource = res;
              } else {
                parentContext.parent.resources[parentContext.index] = res;
              }
              selectEl.replaceWith(option);
              option.onclick = null;
            };
            if (i + 1 === node.resources.length) break;
            const orEl = _IntermediateConverter.converterOrTemplate.content.cloneNode(
              true
            );
            selectList.appendChild(orEl);
          }
          el.appendChild(selectEl);
          return selectEl;
        case "MULTIPLIER":
          multiplier = multiplier.mul(
            this.evaluateSettingsTree(
              node.multiplier,
              settingsForm,
              new FormData(settingsForm)
            )
          );
          console.log(
            "Parsed multiplier for",
            node.resource,
            ": ",
            node.multiplier
          );
          console.log("New multiplier:", multiplier.getMixedFractionString());
          if (multiplier.equals(Rational.zero)) {
          }
          return this.addResourceTreeToElement(
            node.resource,
            { parent: node, index: 0 },
            el,
            settingsForm,
            multiplier
          );
      }
    }
    createIngredientElement(ingr, multiplier) {
      const el = _IntermediateConverter.converterIngredientTemplate.content.cloneNode(
        true
      ).firstElementChild;
      const res = getResource(ingr.id);
      el.querySelector(".converter-ingredient-name").innerText = `${res.getDisplayName()} \u2A09 ${Rational.fromData(ingr.amount).mul(multiplier).getDecimalString()}`;
      el.querySelector(".converter-ingredient-image").src = getSrc(res.getDisplayImage());
      return el;
    }
    // Parse the given resource tree and store it in the output list
    resourceTreeToList(node, output, form, multiplier = Rational.one) {
      switch (node.type) {
        case "RESOURCE":
          output.push({
            resource: getResource(node.id),
            amount: Rational.fromData(node.amount).mul(multiplier)
          });
          break;
        case "AND":
          for (const child of node.resources)
            this.resourceTreeToList(child, output, form, multiplier);
          break;
        case "MULTIPLIER":
          console.log("Encountered multiplier when converting to list");
          multiplier = multiplier.mul(
            this.evaluateSettingsTree(
              node.multiplier,
              form,
              new FormData(form)
            )
          );
          this.resourceTreeToList(node.resource, output, form, multiplier);
          break;
        case "OR":
          throw new Error(
            "Resource tree isn't fully resolved, please select which of the available options to use!"
          );
      }
      return output;
    }
    evaluateSettingsTree(treeNode, form, formData) {
      if (typeof treeNode === "number" || Array.isArray(treeNode))
        return Rational.fromData(treeNode);
      switch (treeNode.type) {
        case "NUMBER":
          const el = form.querySelector(
            `input[name="${treeNode.name}"]`
          );
          const num = Rational.fromInput(
            String(formData.get(treeNode.name).valueOf()),
            el
          );
          if (!num) {
            throw new Error("Bad formatting!");
          }
          return num;
        case "TOGGLE":
          return this.evaluateSettingsTree(
            form.querySelector(
              `input[name="${treeNode.name}"]`
            ).checked ? treeNode.true : treeNode.false,
            form,
            formData
          );
        case "ENUMERATE":
          const chosen = form.querySelector(
            `select[name="${treeNode.name}"]`
          ).value.valueOf();
          for (const [selector, option] of treeNode.options) {
            const selectorMatches = typeof selector === "string" ? selector === chosen : selector.indexOf(chosen) !== -1;
            if (selectorMatches)
              return this.evaluateSettingsTree(option, form, formData);
          }
          for (const [name, option] of treeNode.options) {
            if (name === treeNode.default)
              return this.evaluateSettingsTree(option, form, formData);
          }
          console.log("Couldn't find default value");
          return Rational.zero;
        case "MUL":
          let p = Rational.one;
          for (const child of treeNode.factors)
            p = p.mul(this.evaluateSettingsTree(child, form, formData));
          return p;
        case "DIV":
          return this.evaluateSettingsTree(
            treeNode.numerator,
            form,
            formData
          ).div(
            this.evaluateSettingsTree(treeNode.denominator, form, formData)
          );
        case "ADD":
          let s = Rational.zero;
          for (const child of treeNode.terms)
            s = s.add(this.evaluateSettingsTree(child, form, formData));
          return s;
        case "SUB":
          return this.evaluateSettingsTree(treeNode.term1, form, formData).sub(
            this.evaluateSettingsTree(treeNode.term2, form, formData)
          );
        case "POW":
          throw new Error("Powers aren't supported yet!");
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
    if (!group) throw new Error(`Unit group ${groupName} not found!`);
    if (group.default === unit) return amount;
    const conv = group.conversions.find(([name]) => name === unit);
    if (!conv)
      throw new Error(`Unit ${unit} can't be found in unit group ${groupName}!`);
    return amount.mul(conv[1]);
  }
  function getUnits(groupName) {
    const group = unitGroups.get(groupName);
    if (!group) throw new Error(`Group ${groupName} not found!`);
    const output = group.conversions.map((el) => el[0]);
    output.push(group.default);
    return [output, group.default];
  }
  function populateUnitDropdown(selectEl, groupName) {
    selectEl.innerHTML = "";
    const [units, defaultUnit] = getUnits(groupName);
    for (const unit of units) {
      const optionEl = document.createElement("option");
      optionEl.innerText = unit;
      selectEl.appendChild(optionEl);
      if (unit === defaultUnit) optionEl.selected = true;
    }
  }

  // scripts/resource.ts
  var Resource = class _Resource {
    static infoTemplate = document.querySelector(
      "#resource-info-template"
    );
    displayName;
    displayImage;
    unitGroupName;
    constructor(data) {
      this.displayName = data.displayName;
      this.displayImage = data.displayImage;
      this.unitGroupName = data.unitGroup ?? getDefaultUnitGroup();
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
    // (assumes an empty info panel element)
    populateInfoPanel(panel) {
      const el = _Resource.infoTemplate.content.cloneNode(true);
      el.querySelector(".rc-info-header").innerText = this.getDisplayName();
      el.querySelector(".rc-info-image").src = getSrc(
        this.getDisplayImage()
      );
      panel.appendChild(el);
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
    if (!res.ok) throw new Error("Error during resource loading!");
    const json = await res.json();
    for (const data of json) {
      const r = new Resource(data);
      loadedResources.set(data.id, r);
    }
  }
  function getResource(id) {
    const r = loadedResources.get(id);
    if (!r) throw new Error(`Couldn't find resoure "${id}"!`);
    return r;
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
    if (!res.ok) throw new Error("Error during resource loading!");
    const json = await res.json();
    for (const data of json) {
      const possibleIngr = [];
      parseIngredientListToAllPossible(possibleIngr, {
        type: "AND",
        resources: data.consumes
      });
      const possibleProd = [];
      parseIngredientListToAllPossible(possibleProd, {
        type: "AND",
        resources: data.produces
      });
      loadedConverterFactories.set(data.id, {
        name: data.thumbName ?? data.displayName,
        image: data.displayImage,
        tags: data.tags ?? [],
        possibleIngredients: possibleIngr,
        possibleProducts: possibleProd,
        factory: createFactory(data)
      });
    }
  }
  function createFactory(data) {
    return () => {
      return new IntermediateConverter(
        data.displayName,
        data.thumbName ?? data.displayName,
        data.displayImage,
        { type: "AND", resources: [...data.consumes] },
        { type: "AND", resources: [...data.produces] }
      );
    };
  }
  function parseIngredientListToAllPossible(output, node) {
    switch (node.type) {
      case "RESOURCE":
        output.push(getResource(node.id));
        break;
      case "AND":
      case "OR":
        for (const n of node.resources)
          parseIngredientListToAllPossible(output, n);
        break;
      case "MULTIPLIER":
        parseIngredientListToAllPossible(output, node.resource);
        break;
    }
  }
  function getConverterFactory(id) {
    return loadedConverterFactories.get(id);
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
        const el = this.resourceDeltaTemplate.content.cloneNode(true).firstElementChild;
        el.querySelector(".resource-name").innerText = resource.getDisplayName();
        el.querySelector(".resource-image").src = getSrc(
          resource.getDisplayImage()
        );
        el.querySelector(".resource-amount").innerText = (amount.greaterThan(Rational.zero) ? "+" : "") + amount.getDecimalString();
        el.querySelector(".resource-delta-unit").innerText = getUnits(resource.getUnitGroupName())[1];
        if (amount.lessThan(Rational.zero)) {
          el.classList.add("negative-resource-delta");
          el.onclick = () => this.converterRequestTarget?.requestConverterForResource(
            resource,
            amount
          );
        }
        this.resourceDeltaList.appendChild(el);
      }
      for (const [converter, number] of this.converters.getEntries()) {
        const el = this.converterTemplate.content.cloneNode(true).firstElementChild;
        el.querySelector(".converter-name").innerText = converter.getDisplayName();
        el.querySelector(".converter-image").src = getSrc(
          converter.getDisplayImage()
        );
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
    graph.recalculateIfNeeded();
  }

  // scripts/submitMenu.ts
  var SubmitMenu = class _SubmitMenu {
    static tagListTemplate = document.querySelector("#tag-list-template");
    static thumbTemplate = document.querySelector(
      "#item-converter-thumb"
    );
    graph;
    menuElement;
    headerElement;
    thumbList;
    filterForm;
    submissionForm;
    infoPanel;
    showOnOpen;
    constructor(graph, menuElement, headerElement, thumbList, filterForm, submissionForm, infoPanel, showOnOpen) {
      this.graph = graph;
      this.menuElement = menuElement;
      this.headerElement = headerElement;
      this.thumbList = thumbList;
      this.filterForm = filterForm;
      this.submissionForm = submissionForm;
      this.infoPanel = infoPanel;
      this.showOnOpen = showOnOpen;
      submissionForm.onsubmit = async (e) => {
        e.preventDefault();
        this.onSubmit();
      };
      filterForm.onsubmit = (e) => {
        e.preventDefault();
        this.applyCurrentFilters();
      };
      this.clearFilters();
    }
    open() {
      this.applyCurrentFilters();
      this.menuElement.classList.remove("hidden");
      this.filterForm.classList.remove("hidden");
      this.submissionForm.classList.remove("hidden");
    }
    close() {
      this.clearFilters();
      this.menuElement.classList.add("hidden");
      this.filterForm.classList.add("hidden");
      this.submissionForm.classList.add("hidden");
      this.infoPanel.innerHTML = "";
    }
    addThumbToTagLists(tags, tagListMap, thumbData) {
      for (const tagName of tags) {
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
        tagList.querySelector(".tag-list-content").appendChild(thumb);
      }
    }
    static createTagListIfNotExists(map, name, tagListContainer) {
      if (map.has(name)) return map.get(name);
      const tagList = _SubmitMenu.tagListTemplate.content.cloneNode(true).firstElementChild;
      tagList.querySelector(".tag-list-name").innerText = name;
      tagList.querySelector("button").onclick = () => tagList.querySelector(".tag-list-content").classList.toggle("hidden");
      if (tagListContainer) {
        const children = tagListContainer.children;
        for (let i = 0; i <= children.length; i++) {
          const c = children[i];
          const insertHere = c ? name < c.querySelector(".tag-list-name").innerText : true;
          if (insertHere) {
            tagListContainer.insertBefore(tagList, c);
            break;
          }
        }
      }
      map.set(name, tagList);
      return tagList;
    }
    static createThumb(name, image, onclick) {
      const thumb = _SubmitMenu.thumbTemplate.content.cloneNode(true).querySelector(".thumb");
      thumb.querySelector(".thumb-name").innerText = name;
      thumb.querySelector("img.thumb-image").src = getSrc(image);
      thumb.onclick = onclick;
      return thumb;
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
    constructor(graph, menuElement, headerElement, thumbList, filterForm, converterForm, converterSettingsForm, amountInput, infoPanel, showOnOpen) {
      super(
        graph,
        menuElement,
        headerElement,
        thumbList,
        filterForm,
        converterForm,
        infoPanel,
        showOnOpen
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
        throw new Error("Bad formatting!");
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
          this.intermediateConverter.populateInfoPanel();
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
      this.headerElement.innerText = "Add new converter";
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
      this.headerElement.innerText = `Choose a converter that produces ${resource.getDisplayName()}`;
      this.applyCurrentFilters();
    }
  };

  // scripts/resourceMenu.ts
  var ResourceMenu = class extends SubmitMenu {
    searchString = "";
    unitDropdown;
    constructor(graph, menuElement, headerElement, thumbList, filterForm, converterForm, unitDropdown, infoPanel, showOnOpen) {
      super(
        graph,
        menuElement,
        headerElement,
        thumbList,
        filterForm,
        converterForm,
        infoPanel,
        showOnOpen
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
        throw new Error("Bad formatting");
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
      for (const [, r] of resourceList) {
        const thumb = SubmitMenu.createThumb(
          r.getDisplayName(),
          r.getDisplayImage(),
          () => {
            this.resourceToBeAdded = r;
            this.infoPanel.innerHTML = "";
            r.populateInfoPanel(this.infoPanel);
            populateUnitDropdown(this.unitDropdown, r.getUnitGroupName());
          }
        );
        this.thumbList.appendChild(thumb);
      }
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
    const resourceDeltaList = document.querySelector("#resources");
    const converterList = document.querySelector("#converters");
    const resourceDeltaTemplate = document.querySelector(
      "template#resource-delta-template"
    );
    const converterTemplate = document.querySelector(
      "template#converter-template"
    );
    const confRes = await fetch(
      `/data/${window.location.hash.replace(/^#/, "")}/config.json`
    );
    if (!confRes.ok) {
      throw new Error("Config not found!");
    }
    const config = await confRes.json();
    document.querySelector("#personal-legal-disclaimer").innerText = config.legalDisclaimer;
    loadUnitGroups(config.unitGroups, config.defaultUnitGroup);
    await loadAllResources();
    await loadAllConverters();
    const graph = new ResourceGraph(
      resourceDeltaList,
      converterList,
      resourceDeltaTemplate,
      converterTemplate
    );
    const addRcMenuWrapper = document.querySelector(
      "#add-rc-menu-wrapper"
    );
    const header = addRcMenuWrapper.querySelector("#add-rc-menu-header");
    const thumbList = document.querySelector("#add-rc-tag-list");
    const infoPanel = document.querySelector("#rc-info-panel");
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
      header,
      thumbList,
      rFilter,
      rSubmit,
      rUnitDropdown,
      infoPanel,
      rSubmit
      // For now, this only hides the submission form. If I for some
      // reason need to hide more, this is what to change
    );
    document.querySelector("#open-item-delta-menu-button").onclick = () => resourceMenu.open();
    document.querySelector("#close-item-form-button").onclick = () => resourceMenu.close();
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
      header,
      thumbList,
      cFilter,
      cSubmit,
      cSettings,
      cSubmitAmount,
      infoPanel,
      cFormWrapper
    );
    document.querySelector("#open-converter-menu-button").onclick = () => converterMenu.open();
    document.querySelector("#close-converter-form-button").onclick = () => converterMenu.close();
    graph.setConverterRequestTarget(converterMenu);
    const dupe = getConverterFactory("duplicant").factory().finalize();
    const electrolyzer = getConverterFactory("electrolyzer").factory().finalize();
    graph.addConverter(dupe, new Rational(3));
    graph.addConverter(electrolyzer, new Rational(3 / 5));
  })();
})();
