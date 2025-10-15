import { MonksEnhancedJournal, log, error, i18n, setting, makeid } from "../monks-enhanced-journal.js";

export class EditCurrency extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, options = {}) {
        super(options);
        this.object = object;
        this.currency = MonksEnhancedJournal.currencies;
    }

    static DEFAULT_OPTIONS = {
        id: "journal-editcurrency",
        classes: ["edit-currency"],
        tag: "form",
        form: {
            handler: EditCurrency.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 500,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.EditCurrency",
            contentClasses: ["standard-form"]
        },
        actions: {
            add: EditCurrency.addCurrency,
            remove: EditCurrency.removeCurrency,
            reset: EditCurrency.resetCurrency
        }
    };

    static PARTS = {
        form: {
            template: "./modules/monks-enhanced-journal/templates/edit-currency.hbs"
        }
    };

    _prepareContext(options) {
        return {
            currency: this.currency
        };
    }

    static async #onSubmit(event, form, formData) {
        let data = this.currency.filter(c => !!c.id && !!c.name);
        await game.settings.set('monks-enhanced-journal', 'currency', data);
        this.submitting = true;
    }

    static addCurrency(event, target) {
        this.currency.push({ id: "", name: "", convert: 1 });
        this.refresh();
    }

    changeData(event) {
        let currid = event.currentTarget.closest('li.item').dataset.id;
        let prop = event.currentTarget.getAttribute("name");

        let currency = this.currency.find(c => c.id == currid);
        if (currency) {
            let val = event.currentTarget.value;
            if (prop == "convert") {
                if (isNaN(val))
                    val = 1;
                else
                    val = parseFloat(val);
            }
            else if (prop == "id") {
                val = val.replace(/[^a-z]\-/gi, '');
                event.currentTarget.value = val;
                if (!!this.currency.find(c => c.id == val)) {
                    event.currentTarget.value = currid;
                    return;
                }
                event.currentTarget.closest('li.item').setAttribute("data-id", val);
            }

            currency[prop] = val;
        }
    }

    static removeCurrency(event, target) {
        let currid = target.closest('li.item').dataset.id;
        this.currency.findSplice(s => s.id === currid);
        this.refresh();
    }

    static resetCurrency(event, target) {
        this.currency = MonksEnhancedJournal.defaultCurrencies;
        this.refresh();
    }

    refresh() {
        this.render(true);
        let that = this;
        window.setTimeout(function () { that.setPosition(); }, 500);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const inputs = this.element.querySelectorAll('input[name]');
        inputs.forEach(input => {
            input.addEventListener('change', this.changeData.bind(this));
        });
    }
}