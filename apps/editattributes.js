import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class EditAttributes extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, options = {}) {
        super(options);
        this.object = object;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        id: "edit-attributes",
        classes: ["form", "edit-attributes"],
        tag: "form",
        form: {
            handler: EditAttributes.#onSubmit,
            closeOnSubmit: true,
            submitOnChange: false
        },
        position: {
            width: 600,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.EditAttributes",
            contentClasses: ["standard-form"]
        },
        actions: {
            add: EditAttributes.addAttribute,
            remove: EditAttributes.removeAttribute,
            reset: EditAttributes.resetAttributes
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/editattributes.hbs",
            scrollable: [".item-list"]
        }
    };

    static addAttribute(event, target) {
        this.attributes.push({ id: "", name: "", hidden: false, full: false });
        this.refresh();
    }

    changeData(event) {
        let attrid = event.currentTarget.closest('li.item').dataset.id;
        let prop = event.currentTarget.getAttribute("name");

        let attr = this.attributes.find(c => c.id == attrid);
        if (attr) {
            let val = event.currentTarget.value;
            if (prop == "hidden" || prop == "full") {
                val = event.currentTarget.checked;
            }
            else if (prop == "id") {
                val = val.replace(/[^a-z]/gi, '');
                event.currentTarget.value = val;
                if (!!this.attributes.find(c => c.id == val)) {
                    event.currentTarget.value = attrid;
                    return;
                }
                event.currentTarget.closest('li.item').setAttribute("data-id", val);
            }

            attr[prop] = val;
        }
    }

    static removeAttribute(event, target) {
        let attrid = target.closest('li.item').dataset.id;
        this.attributes.findSplice(s => s.id === attrid);
        this.refresh();
    }

    refresh() {
        this.render(true);
        let that = this;
        window.setTimeout(function () {
            that.setPosition({ height: 'auto' });
        }, 100);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const inputs = this.element.querySelectorAll('input[name]');
        inputs.forEach(input => {
            input.addEventListener('change', this.changeData.bind(this));
        });
    }

    _onDragStart(event) {
        let li = event.currentTarget.closest(".item");
        const dragData = { id: li.dataset.id };
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }

    _canDragStart(selector) {
        return true;
    }

    _onDrop(event) {
        // Try to extract the data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        // Identify the drop target
        const target = event.target.closest(".item") || null;

        // Call the drop handler
        if (target && target.dataset.id) {
            if (data.id === target.dataset.id) return; // Don't drop on yourself

            let from = this.attributes.findIndex(a => a.id == data.id);
            let to = this.attributes.findIndex(a => a.id == target.dataset.id);
            log('from', from, 'to', to);
            this.attributes.splice(to, 0, this.attributes.splice(from, 1)[0]);

            const draggedItem = this.element.querySelector(`.item-list .item[data-id="${data.id}"]`);
            if (from < to)
                target.after(draggedItem);
            else
                target.before(draggedItem);
        }
    }

    static async #onSubmit(event, form, formData) {
        // Implemented in subclasses
    }

    static resetAttributes(event, target) {
        // Implemented in subclasses
    }
}

export class EditPersonAttributes extends EditAttributes {
    constructor(object, options = {}) {
        super(object, options);
    }

    _prepareContext(options) {
        this.attributes = this.attributes || setting("person-attributes");
        return foundry.utils.mergeObject(super._prepareContext(options),
            {
                fields: this.attributes
            }
        );
    }

    static async #onSubmit(event, form, formData) {
        let data = this.attributes.filter(c => !!c.id && !!c.name);
        await game.settings.set('monks-enhanced-journal', 'person-attributes', data);
        this.submitting = true;
    }

    static resetAttributes(event, target) {
        this.attributes = game.settings.settings.get('monks-enhanced-journal.person-attributes').default;
        this.refresh();
    }
}

export class EditPlaceAttributes extends EditAttributes {
    constructor(object, options = {}) {
        super(object, options);
    }

    _prepareContext(options) {
        this.attributes = this.attributes || setting("place-attributes");
        return foundry.utils.mergeObject(super._prepareContext(options),
            {
                fields: this.attributes
            }
        );
    }

    static async #onSubmit(event, form, formData) {
        let data = this.attributes.filter(c => !!c.id && !!c.name);
        await game.settings.set('monks-enhanced-journal', 'place-attributes', data);
        this.submitting = true;
    }

    static resetAttributes(event, target) {
        this.attributes = game.settings.settings.get('monks-enhanced-journal.place-attributes').default;
        this.refresh();
    }
}