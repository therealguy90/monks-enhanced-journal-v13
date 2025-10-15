import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class TrapConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, journalentry, options = {}) {
        super(options);
        this.object = object;
        this.journalentry = journalentry;
    }

    static DEFAULT_OPTIONS = {
        id: "trap-config",
        classes: ["trap-sheet"],
        tag: "form",
        form: {
            handler: TrapConfig.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.TrapConfiguration",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/trap-config.hbs"
        }
    };

    _prepareContext(options) {
        return super._prepareContext(options);
    }

    static async #onSubmit(event, form, formData) {
        log('updating trap', event, formData.object, this.object);

        foundry.utils.mergeObject(this.object, formData.object);
        let traps = foundry.utils.duplicate(this.journalentry.object.flags["monks-enhanced-journal"].traps || []);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            traps.push(this.object);
        }

        await this.journalentry.object.setFlag('monks-enhanced-journal', 'traps', traps);
    }
}