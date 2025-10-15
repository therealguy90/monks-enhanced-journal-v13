import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class Objectives extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, journalentry, options = {}) {
        super(options);
        this.object = object;
        this.journalentry = journalentry;
    }

    static DEFAULT_OPTIONS = {
        id: "objectives",
        classes: ["objective-sheet"],
        tag: "form",
        form: {
            handler: Objectives.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 500,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.Objectives",
            resizable: true,
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/objectives.hbs"
        }
    };

    async _prepareContext(options) {
        let data = super._prepareContext(options);

        //this._convertFormats(data);
        const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;
        data.enrichedText = await TextEditorImpl.enrichHTML(data.object.content, {
            relativeTo: this.journalentry.object,
            secrets: this.journalentry.object.isOwner,
            async: true
        });

        return data;
    }

    static async #onSubmit(event, form, formData) {
        log('updating objective', event, formData.object, this.object);
        foundry.utils.mergeObject(this.object, formData.object);
        let objectives = foundry.utils.duplicate(this.journalentry.object.flags["monks-enhanced-journal"].objectives || []);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            objectives.push(this.object);
        }

        await this.journalentry.object.setFlag('monks-enhanced-journal', 'objectives', objectives);
    }
}