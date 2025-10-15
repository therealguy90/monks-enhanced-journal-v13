import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class DCConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, journalentry, options = {}) {
        super(options);
        this.object = object;
        this.journalentry = journalentry;
    }

    /** @override */
    static DEFAULT_OPTIONS = {
        id: "dc-config",
        classes: ["form", "dc-sheet"],
        tag: "form",
        form: {
            handler: DCConfig.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.DCConfiguration",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/dc-config.hbs"
        }
    };

    static optionList() {
        let config = CONFIG[game.system.id.toUpperCase()] || {};
        if (game.system.id == "tormenta20")
            config = CONFIG.T20;
        else if (game.system.id == "shadowrun5e")
            config = CONFIG.SR5;

        const { lore, ...skills } = config.skillList || {};

        let attributeOptions = [
            { id: "ability", text: "MonksEnhancedJournal.Ability", groups: config.abilities || config.scores || config.atributos },
            { id: "save", text: "MonksEnhancedJournal.SavingThrow", groups: config.savingThrows || config.saves || config.saves_long || config.resistencias || config.abilities },
            { id: "skill", text: "MonksEnhancedJournal.Skill", groups: config.skills || config.pericias || skills }
        ];
        if (game.system.id == "pf2e")
            attributeOptions.push({ id: "attribute", text: i18n("MonksEnhancedJournal.Attribute"), groups: { perception: i18n("PF2E.PerceptionLabel") } });

        attributeOptions = attributeOptions.filter(g => g.groups);
        for (let attr of attributeOptions) {
            attr.groups = foundry.utils.duplicate(attr.groups);
            for (let [k, v] of Object.entries(attr.groups)) {
                attr.groups[k] = v?.label || v;
            }
        }

        return attributeOptions;
    }

    _prepareContext(options) {
        return foundry.utils.mergeObject(super._prepareContext(options),
            {
                attributeOptions: DCConfig.optionList()
            }, { recursive: false }
        );
    }

    /* -------------------------------------------- */

    /** @override */
    static async #onSubmit(event, form, formData) {
        log('updating dc', event, formData, this.object);

        foundry.utils.mergeObject(this.object, formData.object);
        let dcs = foundry.utils.duplicate(this.journalentry.object.flags["monks-enhanced-journal"].dcs || []);
        if (this.object.id == undefined) {
            this.object.id = makeid();
            dcs.push(this.object);
        }
            
        this.journalentry.object.setFlag('monks-enhanced-journal', 'dcs', dcs);
    }

    _onRender(context, options) {
        super._onRender(context, options);
    }

    async close(options) {
        if (this.object.id && (this.object.attribute == 'undefined' || this.object.attribute.indexOf(':') < 0)) {
           this.journalentry.deleteItem(this.object.id, 'dcs');    //delete it if it wasn't created properly
        }
        return super.close(options);
    }
}