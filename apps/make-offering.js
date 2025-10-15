import { MonksEnhancedJournal, log, setting, i18n, makeid, quantityname } from '../monks-enhanced-journal.js';
import { getValue, setValue } from "../helpers.js";

export class MakeOffering extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, journalsheet, options = {}) {
        super(options);
        this.object = object;
        this.journalsheet = journalsheet;
        this.offering = foundry.utils.mergeObject({
            currency: {},
            items: []
        }, options.offering || {});

        if (game.user.character && !this.offering.actor) {
            this.offering.actor = {
                id: game.user.character.id,
                name: game.user.character.name,
                img: game.user.character.img
            }
        }
    }

    static DEFAULT_OPTIONS = {
        id: "make-offering",
        classes: ["make-offering", "monks-journal-sheet", "dialog"],
        tag: "form",
        form: {
            handler: MakeOffering.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 600,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.MakeOffering",
            contentClasses: ["standard-form"]
        },
        actions: {
            "actor-open": MakeOffering.openActor,
            "remove": MakeOffering.removeOffering,
            "cancel": MakeOffering.cancel
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/make-offering.hbs"
        }
    };

    get dragDrop() {
        return [{ dropSelector: ".make-offer-container" }];
    }

    _prepareContext(options) {
        let data = super._prepareContext(options);

        data.private = this.offering.hidden;

        data.currency = MonksEnhancedJournal.currencies.filter(c => c.convert != null).map(c => { return { id: c.id, name: c.name }; });

        data.coins = this.offering.currency;
        data.items = (this.offering.items || []).map(i => {
            let actor = game.actors.get(i.actorId)
            if (!actor)
                return null;

            let item = actor.items.get(i.id);
            if (!item)
                return null;

            let details = MonksEnhancedJournal.getDetails(item);

            return {
                id: i.id,
                name: game.user.isGM ? details.identifiedName : details.name,
                img: details.img,
                qty: i.qty
            }
        }).filter(i => !!i);

        let actor = game.actors.get(this.offering?.actor?.id);
        data.actor = {
            id: actor?.id,
            name: actor?.name || "No Actor",
            img: actor?.img || "icons/svg/mystery-man.svg"
        };

        return data;
    }

    _canDragDrop() {
        return true;
    }

    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (data.type == 'Item') {
            let item = await fromUuid(data.uuid);
            let actor = item.parent;

            //Only allow items from an actor
            if (!actor || actor.compendium)
                return;

            let max = getValue(item.system, quantityname(), null);

            this.offering.actor = {
                id: actor.id,
                name: actor.name,
                img: actor.img
            }

            let result = await this.journalsheet.constructor.confirmQuantity(item, max, "offer", false);
            if ((result?.quantity ?? 0) > 0) {

                this.offering.items.push({
                    id: item.id,
                    itemName: item.name,
                    actorId: actor.id,
                    actorName: actor.name,
                    qty: result.quantity
                });
                this.render();
            }
        } else if (data.type == "Actor") {
            let actor = await fromUuid(data.uuid);

            if (!actor || actor.compendium)
                return;

            this.offering.actor = {
                id: actor.id,
                name: actor.name,
                img: actor.img
            }
            this.render();
        }

        log('drop data', event, data);
    }

    static async #onSubmit(event, form, formData) {
        this.offering.userid = game.user.id;
        this.offering.state = "offering";

        if (game.user.isGM || this.object.isOwner) {
            let offerings = foundry.utils.duplicate(this.object.getFlag("monks-enhanced-journal", "offerings") || []);
            this.offering.id = makeid();
            offerings.unshift(this.offering);
            await this.object.setFlag("monks-enhanced-journal", "offerings", offerings);
        } else {
            MonksEnhancedJournal.emit("makeOffering", { offering: this.offering, uuid: this.object.uuid });
        }
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const privateCheckbox = this.element.querySelector('.private');
        if (privateCheckbox) {
            privateCheckbox.addEventListener("change", (event) => {
                this.offering.hidden = event.target.checked;
            });
        }

        const currencyFields = this.element.querySelectorAll('.currency-field');
        currencyFields.forEach(field => {
            field.addEventListener("blur", (event) => {
                this.offering.currency[event.target.getAttribute("name")] = parseInt(event.target.value || 0);
            });
        });
    }

    static async removeOffering(event, target) {
        const id = target.closest(".item").dataset.id;
        const confirmed = await Dialog.confirm({
            title: `Remove offering Item`,
            content: "Are you sure you want to remove this item from the offering?"
        });
        
        if (confirmed) {
            this.offering.items.findSplice(i => i.id == id);
            this.render();
        }
    }

    static async openActor(event, target) {
        try {
            let actor = game.actors.get(this.offering?.actor?.id);
            if (actor) {
                actor.sheet.render(true);
            }
        } catch {}
    }

    static cancel(event, target) {
        this.close();
    }
}