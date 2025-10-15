import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";

export class TransferCurrency extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, actor, loot, options = {}) {
        super(options);
        this.object = object;
        this.loot = loot;
        this.currency = {};
        this.actor = actor || game.user.character;
    }

    static DEFAULT_OPTIONS = {
        id: "transfer-currency",
        classes: ["transfer-currency", "monks-journal-sheet", "dialog"],
        tag: "form",
        form: {
            handler: TransferCurrency.#onSubmit,
            closeOnSubmit: true,
            submitOnChange: false
        },
        position: {
            width: 600,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.TransferCurrency",
            contentClasses: ["standard-form"]
        },
        actions: {
            "actor-open": TransferCurrency.openActor,
            "clear-all": TransferCurrency.clearAllCurrency,
            "clear": TransferCurrency.clearCurrency,
            "cancel": TransferCurrency.cancel
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/transfer-currency.hbs"
        }
    };

    get dragDrop() {
        return [{ dropSelector: ".transfer-container" }];
    }

    _prepareContext(options) {
        let data = super._prepareContext(options);

        data.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.currency;

        data.actor = {
            id: this.actor?.id,
            name: this.actor?.name || "No Actor",
            img: this.actor?.img || "icons/svg/mystery-man.svg"
        };

        return data;
    }

    _canDragStart(selector) {
        return game.user.isGM;
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.actor = actor;
            this.render();
        }
    }

    static async #onSubmit(event, form, formData) {
        let remainder = this.object.getFlag('monks-enhanced-journal', 'currency');

        for (let [k, v] of Object.entries(this.currency)) {
            if (v < 0) {
                // make sure the character has the currency
                let curr = this.loot.getCurrency(this.actor, k);
                if (curr < Math.abs(v)) {
                    ui.notifications.warn("Actor does not have enough currency: " + k);
                    return false;
                }
            } else if (v > 0) {
                if (remainder[k] < v) {
                    ui.notifications.warn("Loot does not have enough currency: " + k);
                    return false;
                }
            }
        }

        // Perform the update
        let updatedRemainder = foundry.utils.duplicate(remainder);

        for (let [k, v] of Object.entries(this.currency)) {
            if (v != 0) {
                await this.loot.addCurrency(this.actor, k, v);
                updatedRemainder[k] = (updatedRemainder[k] ?? 0) - v;
            }
        }
        
        if (game.user.isGM || this.object.isOwner) {
            await this.object.setFlag('monks-enhanced-journal', 'currency', updatedRemainder);
        } else {
            // Send this to the GM to update the loot sheet currency
            MonksEnhancedJournal.emit("transferCurrency", { currency: updatedRemainder, uuid: this.object.uuid });
        }
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const currencyFields = this.element.querySelectorAll('.currency-field');
        currencyFields.forEach(field => {
            field.addEventListener("blur", (event) => {
                let currName = event.currentTarget.getAttribute("name");
                let lootCurrency = this.loot.object.getFlag("monks-enhanced-journal", "currency") || {};
                let maxCurr = lootCurrency[currName] || 0;
                this.currency[currName] = Math.min(parseInt(event.currentTarget.value || 0), maxCurr);
                event.currentTarget.value = this.currency[currName];
            });
        });
    }

    static clearCurrency(event, target) {
        const id = target.closest(".item").dataset.id;
        this.currency[id] = 0;
        const field = this.element.querySelector(`.currency-field[name="${id}"]`);
        if (field) field.value = '';
    }

    static clearAllCurrency(event, target) {
        this.currency = {};
        this.element.querySelectorAll('.currency-field').forEach(field => {
            field.value = '';
        });
    }

    static async openActor(event, target) {
        try {
            if (this.actor) {
                this.actor.sheet.render(true);
            }
        } catch { }
    }

    static cancel(event, target) {
        this.close();
    }
}