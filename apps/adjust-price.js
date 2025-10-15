import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';
import { MEJHelpers } from '../helpers.js';

export class AdjustPrice extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, options = {}) {
        super(options);

        this.object = object;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        id: "adjust-price",
        classes: ["adjust-price", "monks-journal-sheet", "dialog"],
        tag: "form",
        form: {
            handler: AdjustPrice.#onSubmit,
            closeOnSubmit: true,
            submitOnChange: false
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.AdjustPrices",
            contentClasses: ["standard-form"]
        },
        actions: {
            convert: AdjustPrice.convertItems,
            cancel: AdjustPrice.cancel,
            reset: AdjustPrice.resetValues
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/adjust-price.hbs"
        }
    };

    _prepareContext(options) {
        const original = Object.keys(game.system?.documentTypes?.Item || {});
        let types = original.filter(x => MonksEnhancedJournal.includedTypes.includes(x));
        types = types.reduce((obj, t) => {
            const label = CONFIG.Item?.typeLabels?.[t] ?? t;
            obj[t] = game.i18n.has(label) ? game.i18n.localize(label) : t;
            return obj;
        }, {});
        let defaultAdjustment = setting("adjustment-defaults");
        let adjustment = foundry.utils.duplicate(defaultAdjustment);
        if (this.object)
            adjustment = this.object.getFlag('monks-enhanced-journal', 'adjustment') || {};
        else
            defaultAdjustment = {};
        let data = {
            adjustment,
            types,
            defaultAdjustment
        }
        data.showConvert = !!this.object;

        return foundry.utils.mergeObject(super._prepareContext(options), data );
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const sellFields = this.element.querySelectorAll('.sell-field');
        sellFields.forEach(field => {
            field.addEventListener('blur', this.validateField.bind(this));
        });
    }

    static resetValues(event, target) {
        event.stopPropagation();
        event.preventDefault();

        const sellFields = this.element.querySelectorAll('.sell-field');
        const buyFields = this.element.querySelectorAll('.buy-field');
        sellFields.forEach(field => field.value = '');
        buyFields.forEach(field => field.value = '');
    }

    static cancel(event, target) {
        this.close();
    }

    validateField(event) {
        let val = parseFloat(event.currentTarget.value);
        if (!isNaN(val) && val < 0) {
            event.currentTarget.value = '';
        }
    }

    static async #onSubmit(event, form, formData) {
        let data = foundry.utils.expandObject(formData.object);

        for (let [k,v] of Object.entries(data.adjustment)) {
            if (v.sell == undefined)
                delete data.adjustment[k].sell;
            if (v.buy == undefined)
                delete data.adjustment[k].buy;

            if (Object.keys(data.adjustment[k]).length == 0)
                delete data.adjustment[k];
        }

        if (this.object) {
            await this.object.unsetFlag('monks-enhanced-journal', 'adjustment');
            await this.object.setFlag('monks-enhanced-journal', 'adjustment', data.adjustment);
        } else
            await game.settings.set("monks-enhanced-journal", "adjustment-defaults", data.adjustment, { diff: false });
    }

    static async convertItems(event, target) {
        event.stopPropagation();
        event.preventDefault();

        const form = this.element.querySelector('form');
        const fd = new FormDataExtended(form);
        let data = foundry.utils.expandObject(fd.object);

        for (let [k, v] of Object.entries(data.adjustment)) {
            if (v.sell == undefined)
                delete data.adjustment[k].sell;
            if (v.buy == undefined)
                delete data.adjustment[k].buy;

            if (Object.keys(data.adjustment[k]).length == 0)
                delete data.adjustment[k];
        }

        let adjustment = Object.assign({}, setting("adjustment-defaults"), data.adjustment || {});

        let items = this.object.getFlag('monks-enhanced-journal', 'items') || [];

        for (let item of items) {
            let sell = adjustment[item.type]?.sell ?? adjustment.default.sell ?? 1;
            let price = MEJHelpers.getPrice(foundry.utils.getProperty(item, "flags.monks-enhanced-journal.price"));
            let cost = Math.max(Math.ceil((price.value * sell), 1)) + " " + price.currency;
            foundry.utils.setProperty(item, "flags.monks-enhanced-journal.cost", cost);
        }

        await this.object.update({ "flags.monks-enhanced-journal.items": items }, { focus: false });
    }
}