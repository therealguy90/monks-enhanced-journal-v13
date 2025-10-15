import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class EditFields extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, fields, options = {}) {
        super(options);
        this.object = object;
        this.fields = fields;
    }

    static DEFAULT_OPTIONS = {
        id: "edit-fields",
        classes: ["edit-fields"],
        tag: "form",
        form: {
            handler: EditFields.#onSubmit,
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.EditFields",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/editfields.hbs"
        }
    };

    static async #onSubmit(event, form, formData) {
        let fd = foundry.utils.mergeObject({}, formData.object);
        for (let attr of Object.values(fd.attributes)) {
            attr.hidden = !attr.shown;
            delete attr.shown;
        }
        let attributes = foundry.utils.mergeObject(this.object.flags['monks-enhanced-journal'].attributes, fd.attributes);
        await this.object.update({ "flags.monks-enhanced-journal.attributes": attributes }, { focus: false });
        this.change = true;
    }

    _prepareContext(options) {
        return {
            fields: this.fields
        };
    }
}