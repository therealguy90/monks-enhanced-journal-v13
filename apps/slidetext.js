import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class SlideText extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, config, options = {}) {
        super(options);
        this.object = object;
        this.config = config;
        this.tempdata = foundry.utils.duplicate(object);
    }

    static DEFAULT_OPTIONS = {
        id: "slide-text",
        classes: ["slide-sheet"],
        tag: "form",
        form: {
            handler: SlideText.#onSubmit,
            submitOnChange: false,
            closeOnSubmit: true
        },
        position: {
            width: 350,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.SlideText",
            contentClasses: ["standard-form"]
        },
        actions: {
            "cancel": SlideText.onCancel
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/sheets/slidetext.hbs"
        }
    };

    _prepareContext(options) {
        let windowSize = 25;
        let fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);
        return {
            alignOptions: { left: "MonksEnhancedJournal.Left", center: "MonksEnhancedJournal.Center", right: "MonksEnhancedJournal.Right" },
            fontOptions,
            fontPlaceholder: foundry.utils.getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize,
            colorPlaceholder: foundry.utils.getProperty(this.config.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF",
            ...this.object
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        // Watch for input changes to update preview
        const inputs = this.element.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', this._onChangeInput.bind(this));
            input.addEventListener('input', this._onChangeInput.bind(this));
        });
    }

    async _onChangeInput(event) {
        const formElement = this.element.querySelector('form');
        const formData = new FormDataExtended(formElement);
        const data = foundry.utils.expandObject(formData.object);

        if (Object.keys(data).length == 0)
            return;

        foundry.utils.mergeObject(this.tempdata, data);
        this.config.refreshText(this.tempdata);
    }

    static onCancel(event, target) {
        this.config.refreshText(this.object);
        this.close();
    }

    static async #onSubmit(event, form, formData) {
        foundry.utils.mergeObject(this.object, formData.object);
    }
}