/**
 * Takes care of listeners and things related to the "Add Resource"/"Add Converter" menu(s)
 */

import { displayErr } from "./errors";
import { ResourceGraph } from "./resourceGraph";

export abstract class SubmitMenu {
    protected static tagListTemplate =
        document.querySelector<HTMLTemplateElement>("#tag-list-template")!;
    protected static thumbTemplate = document.querySelector<HTMLTemplateElement>(
        "#item-converter-thumb",
    )!;

    protected graph: ResourceGraph;
    protected menuElement: HTMLElement;
    protected detailPopup: HTMLElement;
    protected headerElement: HTMLElement;
    protected thumbList: HTMLElement;
    protected filterForm: HTMLFormElement;
    protected submissionForm: HTMLFormElement;
    protected infoPanel: HTMLElement;
    protected showOnOpen: HTMLElement;

    constructor(
        graph: ResourceGraph,
        menuElement: HTMLElement,
        detailPopup: HTMLElement,
        headerElement: HTMLElement,
        thumbList: HTMLElement,
        filterForm: HTMLFormElement,
        submissionForm: HTMLFormElement,
        infoPanel: HTMLElement,
        showOnOpen: HTMLElement,
    ) {
        this.graph = graph;
        this.menuElement = menuElement;
        this.detailPopup = detailPopup;
        this.headerElement = headerElement;
        this.thumbList = thumbList;
        this.filterForm = filterForm;
        this.submissionForm = submissionForm;
        this.infoPanel = infoPanel;
        this.showOnOpen = showOnOpen;

        // Listener for submitting
        submissionForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                this.onSubmit();
            } catch (e: any) {
                displayErr(e);
                throw e;
            }
        };

        // Listener for applying filters
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            this.applyCurrentFilters();
        };

        // Submit filter form on any change in input elements
        for (const el of filterForm.getElementsByTagName("input")) {
            el.oninput = () => {
                console.log(filterForm);
                filterForm.requestSubmit();
            };
        }

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
        this.filterForm.reset();
        this.menuElement.classList.remove("hidden");
        this.headerElement.classList.remove("hidden");
        this.filterForm.classList.remove("hidden");
        this.submissionForm.classList.remove("hidden");
    }

    public close() {
        this.closeDetailPopup();
        this.clearFilters();
        this.menuElement.classList.add("hidden");
        this.headerElement.classList.add("hidden");
        console.log(this.headerElement);
        this.filterForm.classList.add("hidden");
        this.submissionForm.classList.add("hidden");
        this.infoPanel.innerHTML = "";
    }

    public openDetailPopup() {
        this.submissionForm.reset();
        this.detailPopup.classList.remove("hidden");
    }

    public closeDetailPopup() {
        this.detailPopup.classList.add("hidden");
    }

    protected addThumbToTagLists(
        tags: string[],
        tagListMap: Map<string, HTMLElement>,
        thumbData: { name: string; image: string; onclick: () => void },
    ) {
        // For each tag, add this element as a child of its thumb list. If this
        // is the first occurence of the tag, make a completely new element and
        // add it to the map
        for (const tagName of tags) {
            // Get the tag list and create it if it doesn't exist yet
            const tagList = SubmitMenu.createTagListIfNotExists(
                tagListMap,
                tagName,
                this.thumbList,
            );

            // Add the thumb to the end of the tag list
            // TODO: Alphabetical order (break out into function in SubmitMenu)
            const thumb = SubmitMenu.createThumb(
                thumbData.name,
                thumbData.image,
                thumbData.onclick,
            );
            SubmitMenu.insertAlphabetical(
                tagList.querySelector(".tag-list-content")!,
                thumb,
                ".thumb-name",
            );
        }
    }

    protected static createTagListIfNotExists(
        map: Map<string, HTMLElement>,
        name: string,
        tagListContainer: HTMLElement | null, // Set to null to not automatically add
    ): HTMLElement {
        if (map.has(name)) return map.get(name)!;

        const tagList = (<HTMLElement>(
            SubmitMenu.tagListTemplate.content.cloneNode(true)
        )).firstElementChild! as HTMLElement;
        tagList.querySelector<HTMLElement>(".tag-list-name")!.innerText = name;
        tagList.querySelector<HTMLElement>("button")!.onclick = () =>
            tagList.querySelector(".tag-list-content")!.classList.toggle("hidden");

        // If the element should automatically be inserted, do that
        if (tagListContainer) {
            this.insertAlphabetical(tagListContainer, tagList, ".tag-list-name");
        }

        map.set(name, tagList);

        return tagList;
    }

    private static insertAlphabetical(
        container: HTMLElement,
        element: HTMLElement,
        textSelector: string,
    ) {
        const name = element.querySelector<HTMLElement>(textSelector)!.innerText;
        const children = container.children;
        for (let i = 0; i <= children.length; i++) {
            const c = children[i]; // is undefined if we're at the end
            // Compare names (if c is undefined we're at the end and should
            // always insert. Yucky, but ¯\_(ツ)_/¯)
            const insertHere = c
                ? name < c.querySelector<HTMLElement>(textSelector)!.innerText
                : true;
            if (insertHere) {
                container.insertBefore(element, c);
                break;
            }
        }
    }

    protected static createThumb(name: string, image: string, onclick: () => void) {
        const thumb = (<HTMLElement>(
            SubmitMenu.thumbTemplate.content.cloneNode(true)
        )).querySelector<HTMLElement>(".thumb")!;
        thumb.querySelector<HTMLElement>(".thumb-name")!.innerText = name;
        thumb.querySelector<HTMLImageElement>("img.thumb-image")!.src = image;
        thumb.onclick = onclick;
        return thumb;
    }
}
