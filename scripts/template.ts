import { ProgramError } from "./errors";

export class Template {
    private el: HTMLTemplateElement;

    constructor(id: string) {
        const templateEl = document.querySelector<HTMLTemplateElement>(
            `template#${id}`,
        );

        if (!templateEl) throw new ProgramError(`Template "${id}" not found!`);

        this.el = templateEl;
    }

    public clone(): DocumentFragment {
        if (!this.el.content) throw new ProgramError(`Template is empty!`);
        return this.el.content.cloneNode(true) as DocumentFragment;
    }

    public cloneElement(): HTMLElement {
        const el = this.clone();
        if (!el.firstElementChild)
            throw new ProgramError(`Template contains no child!`);
        return el.firstElementChild as HTMLElement;
    }
}
