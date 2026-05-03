(() => {
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
        deltas.add(resource, amount * count);
      }
      for (const { resource, amount } of this.ingredients) {
        deltas.add(resource, -amount * count);
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
      for (const { resource: r, amount: amountProduced } of this.products) {
        if (r !== resource) continue;
        return -amount / amountProduced;
      }
      return 0;
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
      if (typeof astNode === "number") return;
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
          for (const [name] of node.options) {
            if (prev.options.indexOf(name) === -1)
              prev.options.push(name);
          }
        }
      } else {
        this.settingsOrder.push(node.name);
        this.settingsLookup.set(node.name, this.makeNewSettingObject(node));
      }
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
          return {
            type: "ENUMERATE",
            options: node.options.map((el) => el[0]),
            default: node.default
          };
      }
    }
  };

  // scripts/util.ts
  function getRoundedString(x) {
    if (Math.abs(x) < 1e-12) return "0";
    let rounded = x.toPrecision(5);
    rounded = rounded.replace(/\.0*$|(\.\d*?)0+$/, "$1");
    return rounded;
  }
  function resolveRational(x) {
    return typeof x === "number" ? x : x[0] / x[1];
  }

  // scripts/intermediateConverter.ts
  var IntermediateConverter = class _IntermediateConverter {
    displayName;
    displayImage;
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
    constructor(displayName, displayImage, ingredients, products) {
      this.displayName = displayName;
      this.displayImage = displayImage;
      this.ingredients = ingredients;
      this.products = products;
      _IntermediateConverter.settingsForm.innerHTML = "";
      const convSettings = this.getAllConverterSettings(
        this.products,
        this.getAllConverterSettings(
          this.ingredients,
          new ConverterSettings()
        )
      );
      for (const [name, setting] of convSettings.getAllSettings()) {
        const settingEl = this.createSettingInput(name, setting);
        _IntermediateConverter.settingsForm.appendChild(settingEl);
      }
    }
    getDisplayName() {
      return this.displayName;
    }
    getDisplayImage() {
      return this.displayImage;
    }
    // Returns a finalized converter, provided that all ambiguities are resolved
    finalize() {
      const settingsData = new FormData(_IntermediateConverter.settingsForm);
      const ingr = this.resourceTreeToList(
        this.ingredients,
        [],
        settingsData
      );
      const prod = this.resourceTreeToList(this.products, [], settingsData);
      return new Converter(this.displayName, this.displayImage, ingr, prod);
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
      const settingsData = new FormData(_IntermediateConverter.settingsForm);
      this.addResourceTreeToElement(
        this.ingredients,
        null,
        el.querySelector(".c-info-ingredients"),
        settingsData
      );
      this.addResourceTreeToElement(
        this.products,
        null,
        el.querySelector(".c-info-products"),
        settingsData
      );
      _IntermediateConverter.infoPanel.appendChild(el);
    }
    createSettingInput(name, setting) {
      switch (setting.type) {
        case "NUMBER": {
          const [settingEl, , input] = this.createInputElement(name);
          input.type = "number";
          input.value = String(setting.default);
          return settingEl;
        }
        case "TOGGLE": {
          const [settingEl, , input] = this.createInputElement(name);
          input.type = "checkbox";
          input.checked = setting.default;
          return settingEl;
        }
        case "ENUMERATE": {
          const [settingEl, , select] = this.createSelectElement(name);
          for (const optionName of setting.options) {
            const optionEl = document.createElement("option");
            optionEl.value = optionName;
            optionEl.innerText = optionName;
            select.appendChild(optionEl);
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
    addResourceTreeToElement(node, parentContext, el, settingsData, multiplier = 1) {
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
              { node, index },
              andEl,
              settingsData,
              multiplier
            );
          });
          el.appendChild(andEl);
          return andEl;
        case "OR":
          const selectEl = _IntermediateConverter.converterSelectTemplate.content.cloneNode(
            true
          ).firstElementChild;
          const selectList = selectEl.querySelector(
            ".converter-select-children"
          );
          for (let i = 0; i < node.resources.length; i++) {
            const res = node.resources[i];
            const option = this.addResourceTreeToElement(
              res,
              { node, index: i },
              selectList,
              settingsData,
              multiplier
            );
            option.onclick = () => {
              if (!parentContext)
                throw new Error("An OR node can't be a root node!");
              parentContext.node.resources[parentContext.index] = res;
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
          multiplier *= this.evaluateSettingsTree(
            node.multiplier,
            settingsData
          );
          if (multiplier === 0) {
          }
          return this.addResourceTreeToElement(
            node.resource,
            parentContext,
            el,
            settingsData,
            multiplier
          );
      }
    }
    createIngredientElement(ingr, multiplier) {
      const el = _IntermediateConverter.converterIngredientTemplate.content.cloneNode(
        true
      ).firstElementChild;
      const res = getResource(ingr.id);
      el.querySelector(".converter-ingredient-name").innerText = `${res.getDisplayName()} \u2A09 ${getRoundedString(resolveRational(ingr.amount) * multiplier)}`;
      el.querySelector(".converter-ingredient-image").src = getSrc(res.getDisplayImage());
      return el;
    }
    // Parse the given resource tree and store it in the output list
    resourceTreeToList(node, output, settingsData, multiplier = 1) {
      switch (node.type) {
        case "RESOURCE":
          output.push({
            resource: getResource(node.id),
            amount: resolveRational(node.amount) * multiplier
          });
          break;
        case "AND":
          for (const child of node.resources)
            this.resourceTreeToList(
              child,
              output,
              settingsData,
              multiplier
            );
          break;
        case "MULTIPLIER":
          multiplier *= this.evaluateSettingsTree(
            node.multiplier,
            settingsData
          );
          this.resourceTreeToList(
            node.resource,
            output,
            settingsData,
            multiplier
          );
          break;
        case "OR":
          throw new Error(
            "Resource tree isn't fully resolved, please select which of the available options to use!"
          );
      }
      return output;
    }
    evaluateSettingsTree(treeNode, formData) {
      if (typeof treeNode === "number") return treeNode;
      switch (treeNode.type) {
        case "NUMBER":
          return Number(formData.get(treeNode.name).valueOf());
        case "TOGGLE":
          return this.evaluateSettingsTree(
            formData.get(treeNode.name) ? treeNode.true : treeNode.false,
            formData
          );
        case "ENUMERATE":
          const chosen = formData.get(treeNode.name).valueOf();
          for (const [name, option] of treeNode.options) {
            if (name === chosen)
              return this.evaluateSettingsTree(option, formData);
          }
          return 0;
        case "MUL":
          let p = 1;
          for (const child of treeNode.factors)
            p *= this.evaluateSettingsTree(child, formData);
          return p;
        case "DIV":
          return this.evaluateSettingsTree(treeNode.numerator, formData) / this.evaluateSettingsTree(treeNode.denominator, formData);
        case "ADD":
          let s = 0;
          for (const child of treeNode.terms)
            s += this.evaluateSettingsTree(child, formData);
          return s;
        case "SUB":
          return this.evaluateSettingsTree(treeNode.term1, formData) - this.evaluateSettingsTree(treeNode.term2, formData);
        case "POW":
          return Math.pow(
            this.evaluateSettingsTree(treeNode.base, formData),
            this.evaluateSettingsTree(treeNode.exponent, formData)
          );
      }
    }
  };

  // scripts/resource.ts
  var Resource = class _Resource {
    static infoTemplate = document.querySelector(
      "#resource-info-template"
    );
    displayName;
    displayImage;
    constructor(data) {
      this.displayName = data.displayName;
      this.displayImage = data.displayImage;
    }
    getDisplayName() {
      return this.displayName;
    }
    getDisplayImage() {
      return this.displayImage;
    }
    // (assumes an empty info panel element)
    populateInfoPanel(panel) {
      const el = _Resource.infoTemplate.content.cloneNode(
        true
      );
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
        name: data.displayName,
        image: data.displayImage,
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
        if (c.possibleIngredients.indexOf(consFilter) !== -1) {
          consumesPasses = true;
          break;
        }
      }
      if (!consumesPasses) continue;
      let producePasses = anyResourceProduced.length == 0;
      for (const prodFilter of anyResourceProduced) {
        if (c.possibleProducts.indexOf(prodFilter) !== -1) {
          producePasses = true;
          break;
        }
      }
      if (!producePasses) continue;
      output.push([id, c]);
    }
    return output;
  }

  // scripts/resourceGraph.ts
  var ResourceDeltaList = class {
    deltas = /* @__PURE__ */ new Map();
    add(resource, delta) {
      this.deltas.set(resource, (this.deltas.get(resource) ?? 0) + delta);
    }
    getEntries() {
      return this.deltas.entries();
    }
  };
  var ResourceGraph = class {
    // All conversions that are happening
    converters = /* @__PURE__ */ new Map();
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
      const resourceDeltas = new ResourceDeltaList();
      for (const [converter, count] of this.converters) {
        converter.apply(resourceDeltas, count);
      }
      this.resourceDeltaList.innerHTML = "";
      this.converterList.innerHTML = "";
      for (const [resource, amount] of resourceDeltas.getEntries()) {
        const el = this.resourceDeltaTemplate.content.cloneNode(
          true
        ).querySelector(".resource-delta");
        el.querySelector(".resource-name").innerText = resource.getDisplayName();
        el.querySelector(".resource-image").src = getSrc(
          resource.getDisplayImage()
        );
        el.querySelector(".resource-amount").innerText = getRoundedString(amount);
        if (amount < 0) {
          el.classList.add("negative-resource-delta");
          el.onclick = () => this.converterRequestTarget?.requestConverterForResource(
            resource,
            amount
          );
        }
        this.resourceDeltaList.appendChild(el);
      }
      for (const [converter, number] of this.converters) {
        const el = this.converterTemplate.content.cloneNode(true).firstElementChild;
        el.querySelector(".converter-name").innerText = converter.getDisplayName();
        el.querySelector(".converter-image").src = getSrc(converter.getDisplayImage());
        const amountEl = el.querySelector(".converter-amount");
        amountEl.value = String(number);
        amountEl.onchange = (e) => {
          this.setConverterAmount(
            converter,
            Number(e.target.value)
          );
        };
        el.querySelector(".remove-converter-button").onclick = () => this.removeConverter(converter);
        this.converterList.appendChild(el);
      }
    }
    addConverter(converter, count) {
      this.converters.set(
        converter,
        (this.converters.get(converter) ?? 0) + count
      );
      this.requiresRecalculation = true;
    }
    removeConverter(converter) {
      this.converters.delete(converter);
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

  // scripts/menus.ts
  var SubmitMenu = class {
    static thumbTemplate = document.querySelector("#item-converter-thumb");
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
  };
  var ConverterMenu = class _ConverterMenu extends SubmitMenu {
    amountInput;
    resourceBeingRequested = null;
    amountOfResourceBeingRequested = 0;
    searchString = "";
    // Since settings can be changed, which requires a converter and not a factory,
    // intermediate converter storage is required
    intermediateConverter = null;
    constructor(graph, menuElement, headerElement, thumbList, filterForm, converterForm, amountInput, infoPanel, showOnOpen) {
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
    }
    onSubmit() {
      if (!this.intermediateConverter) return;
      const formData = new FormData(this.submissionForm);
      const converter = this.intermediateConverter.finalize();
      const amount = this.resourceBeingRequested ? converter.getAmountToProduce(
        this.resourceBeingRequested,
        this.amountOfResourceBeingRequested
      ) : Number(formData.get("amount").valueOf());
      if (amount != 0) {
        this.graph.addConverter(converter, amount);
      }
      this.close();
    }
    // Note: Does not apply changes!
    clearFilters() {
      this.filterForm.querySelector(
        "input[name=search-string]"
      ).value = "";
      this.resourceBeingRequested = null;
      this.amountOfResourceBeingRequested = 0;
    }
    applyCurrentFilters() {
      this.thumbList.innerHTML = "";
      const formData = new FormData(this.filterForm);
      this.searchString = String(formData.get("search-string").valueOf());
      const list = getConverterFactoriesWithFilters(
        this.searchString,
        this.resourceBeingRequested ? [this.resourceBeingRequested] : [],
        []
      );
      for (const [_, cFact] of list) {
        const thumb = _ConverterMenu.thumbTemplate.content.cloneNode(true).querySelector(".thumb");
        thumb.querySelector(".thumb-name").innerText = cFact.name;
        thumb.querySelector("img.thumb-image").src = getSrc(cFact.image);
        thumb.onclick = () => {
          this.infoPanel.innerHTML = "";
          this.intermediateConverter = cFact.factory();
          this.intermediateConverter.populateInfoPanel();
        };
        this.thumbList.appendChild(thumb);
      }
    }
    open() {
      super.open();
      this.headerElement.innerText = "Add new converter";
    }
    close() {
      super.close();
      this.intermediateConverter = null;
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
  var ResourceMenu = class _ResourceMenu extends SubmitMenu {
    searchString = "";
    // To match with ConverterMenu, I'm also storing the resource to be added here instead of as a text input
    resourceToBeAdded = null;
    // Submit the form
    onSubmit() {
      if (!this.resourceToBeAdded) return;
      const formData = new FormData(this.submissionForm);
      const delta = Number(formData.get("delta").valueOf());
      const resource = this.resourceToBeAdded;
      if (delta != 0) {
        const itemList = [{ resource, amount: 1 }];
        const conv = new Converter(
          `Resource ${delta > 0 ? "source" : "drain"}: ${resource.getDisplayName()}`,
          resource.getDisplayImage(),
          // Put the item either as an ingredient or a product, depending on
          // whether this is a producer or consumer
          delta < 0 ? itemList : [],
          delta > 0 ? itemList : []
        );
        this.graph.addConverter(conv, Math.abs(delta));
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
      const list = getResourcesWithFilter(this.searchString);
      for (const [, r] of list) {
        const thumb = _ResourceMenu.thumbTemplate.content.cloneNode(true).querySelector(".thumb");
        thumb.querySelector(".thumb-name").innerText = r.getDisplayName();
        thumb.querySelector("img.thumb-image").src = getSrc(r.getDisplayImage());
        thumb.onclick = () => {
          this.resourceToBeAdded = r;
          this.infoPanel.innerHTML = "";
          r.populateInfoPanel(this.infoPanel);
        };
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
    const resourceDeltaList = document.querySelector(
      "#resources"
    );
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
    document.querySelector(
      "#personal-legal-disclaimer"
    ).innerText = config.legalDisclaimer;
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
    const header = addRcMenuWrapper.querySelector(
      "#add-rc-menu-header"
    );
    const thumbList = document.querySelector("#add-rc-thumb-list");
    const infoPanel = document.querySelector("#rc-info-panel");
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
      infoPanel,
      rSubmit
      // For now, this only hides the submission form. If I for some
      // reason need to hide more, this is what to change
    );
    document.querySelector(
      "#open-item-delta-menu-button"
    ).onclick = () => resourceMenu.open();
    document.querySelector("#close-item-form-button").onclick = () => resourceMenu.close();
    const cFilter = document.querySelector(
      "form#converter-filter-form"
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
      cSubmitAmount,
      infoPanel,
      cFormWrapper
    );
    document.querySelector(
      "#open-converter-menu-button"
    ).onclick = () => converterMenu.open();
    document.querySelector(
      "#close-converter-form-button"
    ).onclick = () => converterMenu.close();
    graph.setConverterRequestTarget(converterMenu);
    const water = getResource("water");
    const dupe = getConverterFactory("duplicant").factory().finalize();
    const electrolyzer = getConverterFactory("electrolyzer").factory().finalize();
    graph.addConverter(dupe, 3);
    graph.addConverter(electrolyzer, 1);
  })();
})();
