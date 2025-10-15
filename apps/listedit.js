import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";

export class ListEdit extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, sheet, options = {}) {
        super(options);
        this.object = object;
        this.sheet = sheet;
    }

    static DEFAULT_OPTIONS = {
        classes: ["list-edit"],
        tag: "form",
        form: {
            handler: ListEdit.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 800,
            height: "auto"
        },
        window: {
            title: "Edit Item",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "./modules/monks-enhanced-journal/templates/sheets/listitem.hbs"
        }
    };

    async _prepareContext(options) {
        let data = this.object.data;
        const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;
        data.enrichedText = await TextEditorImpl.enrichHTML(data.text, {
            relativeTo: this.object,
            secrets: this.sheet.object.isOwner,
            async: true
        });
        const folders = this.sheet.folders;
        return {
            data: data,
            name: data.name || game.i18n.format("DOCUMENT.New", { type: options.type }),
            folder: data.folder,
            folders: folders,
            hasFolders: folders.length > 0,
            hasNumber: this.sheet.hasNumbers
        };
    }

    static async #onSubmit(event, form, formData) {
        foundry.utils.mergeObject(this.object.data, formData.object);
        let items = foundry.utils.duplicate(this.sheet.object.flags["monks-enhanced-journal"].items || []);
        if (this.object.id == undefined) {
            this.object.data.id = makeid();
            items.push(this.object.data);
        } else {
            items.findSplice((i) => i.id == this.object.id, this.object.data);
        }

        await this.sheet.object.setFlag('monks-enhanced-journal', 'items', items);
    }
}