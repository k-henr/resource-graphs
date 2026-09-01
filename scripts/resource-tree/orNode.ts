import { ConverterSettings } from "../converterSettings";
import { displayErr, ProgramError, UserError } from "../errors";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterDependency, ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
/**
 * A node which generates a number of options. The user then chooses one, which
 * "collapses" this node into just that branch.
 *
 * All or nodes (except those with a multiplier of 0, or those hidden by BRANCH nodes
 * or similar) have to be resolved to finalize the tree.
 */

export class OrNode extends ResourceTreeBoolNode {
    private options: [string | string[], ResourceTree][];
    private chosenOption: ResourceTree | null = null;

    // Keeps a map of all the current options, to avoid having to redo the onclick
    // for option divs when an option changes due to being collapsed
    private readonly optionNameToTreeMap = new Map<string, ResourceTree>();

    // Since a single node can have multiple elements, I need to track which option
    // elements should replace which OR node elements, which is what this map does
    private readonly elementAndOptionNameToOptionElementMap = new Map<
        HTMLElement,
        Map<string, HTMLElement>
    >();

    // Element representing an option
    private static converterSelectTemplate = new Template(
        "converter-select-template",
    );
    // Element for containing an option
    private static converterOptionTemplate = new Template(
        "converter-option-template",
    );
    // Element inbetween options that just says "OR"
    private static converterOrTemplate = new Template("converter-or-template");

    // (the options list is a list of name/option pairs)
    constructor(options: [string | string[], ResourceTree][]) {
        super(options.map(([, r]) => r));
        console.log(options);
        this.options = options;
    }

    public createElement(): HTMLElement {
        // If this node has already been collapsed, don't allow new element creation
        // (not sure if this would actually break stuff, but it shouldn't be allowed
        // to happen either way)
        if (this.chosenOption)
            throw new ProgramError(
                "Tried to create an element for an already-collapsed OR node!",
            );

        // Make the OR element
        const el = OrNode.converterSelectTemplate.cloneElement();

        // Add the OR element to the option element map
        const optionElementMap = new Map<string, HTMLElement>();
        this.elementAndOptionNameToOptionElementMap.set(el, optionElementMap);

        // Get the element where all the options are added
        const selectList = el.querySelector<Element>(".converter-select-children")!;

        let numOptions = 0;

        // Loop over all possible options for this node
        // (this.children is being set in the super constructor to be the class
        // representations of the nodes)
        for (let i = 0; i < this.options.length; i++) {
            const optionName = this.options[i][0];
            const optionList =
                typeof optionName === "string" ? [optionName] : optionName;
            const option = this.children[i];

            for (const name of optionList) {
                console.log(option);
                this.optionNameToTreeMap.set(name, option);
                // Create a container for the option. This container is what's being
                // accessed in the collapse function, which means that the content of
                // the wrapper can change without having to make a new collapse
                // function and re-set the onclick for that element
                const optionContainer =
                    OrNode.converterOptionTemplate.cloneElement();
                console.log(optionContainer);

                // Create an element for the option and add it to the container
                const optionEl = option.createElement();
                optionContainer.appendChild(optionEl);

                // Add the option element to the map
                console.log(
                    "Storing",
                    optionEl,
                    "as option",
                    name,
                    "for element",
                    el,
                );
                console.log([el, name]);
                optionElementMap.set(name, optionEl);
                console.log(this.elementAndOptionNameToOptionElementMap);

                // Set a listener for the option container to collapse into it
                optionContainer.onclick = () => {
                    try {
                        console.log("Choosing option", name);
                        this.chooseOption(name);
                    } catch (e: any) {
                        displayErr(e);
                        throw e;
                    }
                };

                selectList.appendChild(optionContainer);
                numOptions++;

                // Add display "OR"s in between the options
                selectList.appendChild(OrNode.converterOrTemplate.clone());
            }
        }

        // If there should be a "nothing" option, add it
        // (temporarily removed until after rework of the system. This'll probably
        // have to always happen, and then just hiding it when it shouldn't be there.
        // Which may mean adding a return value to updateNode)
        //
        // if (encounteredEmptyNode || !encounteredNonemptyNode) {
        //     if (numOptions != 0) this.addOrElement(selectList); // If there were any previous options
        //     numOptions++;
        //     // Make a dummy "nothing" node
        //     const nothingNode = new NothingNode();
        //     this.makeOptionElement(
        //         nothingNode,
        //         multiplier,
        //         parent,
        //         selectEl,
        //         selectList,
        //         requestingConverter,
        //     );
        // }

        // Remove the last OR, if any OR was added
        // (todo: don't do this if there was a nothing node added to the end)
        if (this.options.length > 0) {
            selectList.removeChild(
                selectList.children[selectList.children.length - 1],
            );
        }

        // Set the number of options
        el.querySelector<HTMLElement>(".converter-select-count")!.innerText =
            String(numOptions);

        this.elements.push(el);
        return el;
    }

    // Choose the given option
    public chooseOption(optionName: string) {
        // Replace the parent with the option in the lookup
        const chosenOption = this.optionNameToTreeMap.get(optionName);
        if (!chosenOption)
            throw new ProgramError(
                `Option "${optionName}" not found in lookup when trying to collapse OR node!`,
            );
        // Set the chosen option in this node
        this.chosenOption = chosenOption;

        // Replace all tracked elements with the element representing the chosen option
        for (const el of this.elements) {
            console.log("Trying to replace", el, "with option", optionName);
            console.log([el, optionName]);

            const optionEl = this.elementAndOptionNameToOptionElementMap
                .get(el)
                ?.get(optionName);
            if (!optionEl)
                throw new ProgramError(
                    `An element representing an OR node did not store the element for option "${optionName}"!`,
                );
            el.firstElementChild!.replaceWith(optionEl);
        }
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        converterDependencies: ConverterDependency[],
        settings: ConverterSettings,
        multiplier: Rational = Rational.one,
    ): ConverterIngredient[] {
        if (!this.chosenOption)
            throw new UserError(
                "All OR nodes aren't resolved, please choose an option!",
            );
        return this.chosenOption.addResourcesToList(
            output,
            converterDependencies,
            settings,
            multiplier,
        );
    }
}
