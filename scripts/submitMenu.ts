/**
 * Takes care of listeners and things related to the "Add Resource"/"Add Converter" menu(s)
 */

import { ResourceGraph } from "./resourceGraph";

export abstract class SubmitMenu {
    protected static tagListTemplate =
        document.querySelector<HTMLTemplateElement>("#tag-list-template")!;
    protected static thumbTemplate = document.querySelector<HTMLTemplateElement>(
        "#item-converter-thumb",
    )!;

    protected graph: ResourceGraph;
    protected menuElement: HTMLElement;
    protected headerElement: HTMLElement;
    protected thumbList: HTMLElement;
    protected filterForm: HTMLFormElement;
    protected submissionForm: HTMLFormElement;
    protected infoPanel: HTMLElement;
    protected showOnOpen: HTMLElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        submissionForm: HTMLFormElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
    ) {
        this.graph = graph;
        this.menuElement = menuElement;
        this.headerElement = headerElement;
        this.thumbList = thumbList;
        this.filterForm = filterForm;
        this.submissionForm = submissionForm;
        this.infoPanel = infoPanel;
        this.showOnOpen = showOnOpen;

        // Listener for submitting
        submissionForm.onsubmit = async (e) => {
            e.preventDefault();
            this.onSubmit();
        };

        // Listener for applying filters
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            this.applyCurrentFilters();
        };

        this.clearFilters();
    }

    // Runs when the submission form was submitted
    protected abstract onSubmit(): void;

    // Reset all filters and their visuals
    protected abstract clearFilters(): void;

    // Apply the filters currently stored in the menu
    protected abstract applyCurrentFilters(): void;

    public open() {
        this.applyCurrentFilters();
        this.menuElement.classList.remove("hidden");
        this.filterForm.classList.remove("hidden");
        this.submissionForm.classList.remove("hidden");
    }

    public close() {
        this.clearFilters();
        this.menuElement.classList.add("hidden");
        this.filterForm.classList.add("hidden");
        this.submissionForm.classList.add("hidden");
        this.infoPanel.innerHTML = "";
    }
}
