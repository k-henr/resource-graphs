import { displayErr, ProgramError, UserError } from "../errors";
import { IntermediateConverter } from "../intermediateConverter";
import { Rational } from "../rational";
import { Template } from "../template";
import { ConverterIngredient } from "../types";
import { ResourceTree } from "./resourceTree";
import { ResourceTreeBoolNode } from "./resourceTreeBoolNode";
/**
 * A node which generates a number of options. The user then chooses one, which
 * "collapses" this node into just that branch.
 *
 * All or nodes have to be resolved to finalize the tree.
 */

export class OrNode extends ResourceTreeBoolNode {
    public readonly thisElement: HTMLElement;
    get element(): HTMLElement {
        // If an option has been chosen, this node just points to that element
        if (this.chosenOption) return this.chosenOption.element;
        return this.thisElement;
    }

    private chosenOption: ResourceTree | null = null;

    // Keeps a map of all the current options, to avoid having to redo the onclick
    // for option divs when an option changes due to being collapsed
    private readonly optionNameToTreeMap = new Map<string, ResourceTree>();

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
    constructor(options: [string, ResourceTree][]) {
        super(options.map(([, r]) => r));

        // Make the OR element
        this.thisElement = OrNode.converterSelectTemplate.cloneElement();

        // Get the list where all the options go
        const selectList = this.element.querySelector<Element>(
            ".converter-select-children",
        )!;

        let numOptions = 0;

        // Loop over all possible options for this node
        // (this.children is being set in the super constructor to be the class
        // representations of the nodes)
        for (let i = 0; i < options.length; i++) {
            const optionName = options[i][0];
            const option = this.children[i];
            this.optionNameToTreeMap.set(optionName, option);
            // Create a wrapper for the option. This wrapper is what's being accessed
            // in the collapse function, which means that the content of the wrapper
            // can change without having to make a new collapse function and re-set
            // the onclick for that element
            const optionWrapper = OrNode.converterOptionTemplate.cloneElement();
            optionWrapper.appendChild(option.element);

            // Set a listener for the option wrapper to collapse into it
            optionWrapper.onclick = () => {
                try {
                    this.chooseOption(optionName);
                } catch (e: any) {
                    displayErr(e);
                    throw e;
                }
            };

            selectList.appendChild(optionWrapper);
            numOptions++;

            // Add display "OR"s in between the options
            if (i !== options.length - 1) {
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

        // set the number of options
        this.element.querySelector<HTMLElement>(
            ".converter-select-count",
        )!.innerText = String(numOptions);
    }

    // Choose the given option
    public chooseOption(optionName: string) {
        // Replace the parent with the option in the lookup
        const chosenOption = this.optionNameToTreeMap.get(optionName);
        if (!chosenOption)
            throw new ProgramError(
                `Option "${optionName}" not found in lookup when trying to collapse OR node!`,
            );
        // Set the chosen option
        this.chosenOption = chosenOption;
        // Collapse the tree display to the chosen option's element
        this.thisElement.replaceWith(chosenOption.element);
    }

    public override addResourcesToList(
        output: ConverterIngredient[],
        converter: IntermediateConverter,
        multiplier: Rational = Rational.one,
    ): ConverterIngredient[] {
        if (!this.chosenOption)
            throw new UserError(
                "All OR nodes aren't resolved, please choose an option!",
            );
        return this.chosenOption.addResourcesToList(output, converter, multiplier);
    }
}
