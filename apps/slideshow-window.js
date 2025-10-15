import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class SlideshowWindow extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, options = {}) {
        super(options);
        this.object = object;
    }

    static DEFAULT_OPTIONS = {
        id: "slideshow-display",
        classes: ["sheet"],
        tag: "form",
        form: {
            handler: SlideshowWindow.#onSubmit,
            closeOnSubmit: false,
            submitOnChange: false,
            submitOnClose: false
        },
        position: {
            width: window.innerWidth * 0.75,
            height: window.innerHeight * 0.75
        },
        window: {
            title: ".",
            resizable: true,
            minimizable: false,
            contentClasses: []
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/sheets/slideshow-display.hbs"
        }
    };

    get title() {
        return this.object.name;
    }

    static async #onSubmit(event, form, formData) {
        // No submission logic needed for display window
    }
}