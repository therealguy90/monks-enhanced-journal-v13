import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';

export class CustomisePages extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {

    constructor(object, options = {}) {
        super(options);
        this.object = object;

        this.sheetSettings = {};
        let types = MonksEnhancedJournal.getDocumentTypes();
        for (let page of CustomisePages.typeList) {
            this.sheetSettings[page] = {};
            let cls = types[page];
            if (!cls) continue;
            if (cls.sheetSettings != undefined) {
                let settings = cls.sheetSettings();
                this.sheetSettings[page] = settings;
            }
        }
    }

    get activeCategory() {
        return this._tabs?.[0]?.active;
    }

    static get typeList() {
        return ["encounter", "event", "organization", "person", "picture", "place", "poi", "quest", "shop"];
    }

    static DEFAULT_OPTIONS = {
        id: "customise-pages",
        classes: [],
        tag: "form",
        form: {
            handler: CustomisePages.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 800,
            height: "auto"
        },
        window: {
            title: "Customise Pages",
            resizable: true,
            contentClasses: ["standard-form"]
        },
        actions: {
            "reset-all": CustomisePages.onResetDefaults,
            "delete-attribute": CustomisePages.removeAttribute,
            "add-attribute": CustomisePages.addAttribute
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/customise/customise-pages.hbs",
            scrollable: [".sidebar .tabs", ".item-list"]
        }
    };

    get dragDrop() {
        return [{ dragSelector: ".reorder-attribute", dropSelector: ".item-list" }];
    }

    async _preparePartContext(partId, context, options) {
        context = await super._preparePartContext(partId, context, options);

        // Load sub-templates for each page type
        let load_templates = {};
        for (let page of CustomisePages.typeList) {
            let template = `modules/monks-enhanced-journal/templates/customise/${page}.hbs`;
            load_templates[page] = template;
        }
        await loadTemplates(load_templates);

        return context;
    }

    _prepareContext(options) {
        let data = super._prepareContext(options);
        data.generalEdit = true;
        data.sheetSettings = foundry.utils.duplicate(this.sheetSettings);

        for (let page of CustomisePages.typeList) {
            data.sheetSettings[page] = MonksEnhancedJournal.convertObjectToArray(data.sheetSettings[page]);
        }

        return data;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const inputs = this.element.querySelectorAll('input[name]');
        inputs.forEach(input => {
            input.addEventListener('change', this.changeData.bind(this));
        });

        // Set up tabs manually since ApplicationV2 doesn't have built-in tab support like FormApplication
        this._setupTabs();
    }

    _setupTabs() {
        // Initialize tabs for the main page navigation
        const mainTabs = this.element.querySelectorAll('.page-tabs [data-tab]');
        const mainContents = this.element.querySelectorAll('.categories > div[data-tab]');
        
        mainTabs.forEach(tab => {
            tab.addEventListener('click', (event) => {
                event.preventDefault();
                const targetTab = tab.dataset.tab;
                
                mainTabs.forEach(t => t.classList.remove('active'));
                mainContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = this.element.querySelector(`.categories > div[data-tab="${targetTab}"]`);
                if (targetContent) targetContent.classList.add('active');
            });
        });

        // Initialize tabs for each page type
        for (let page of CustomisePages.typeList) {
            const pageTabs = this.element.querySelectorAll(`.${page}-tabs [data-tab]`);
            const pageContents = this.element.querySelectorAll(`.${page}-body > div[data-tab]`);
            
            pageTabs.forEach(tab => {
                tab.addEventListener('click', (event) => {
                    event.preventDefault();
                    const targetTab = tab.dataset.tab;
                    
                    pageTabs.forEach(t => t.classList.remove('active'));
                    pageContents.forEach(c => c.classList.remove('active'));
                    
                    tab.classList.add('active');
                    const targetContent = this.element.querySelector(`.${page}-body > div[data-tab="${targetTab}"]`);
                    if (targetContent) targetContent.classList.add('active');
                });
            });
        }
    }

    get currentType() {
        return this._tabs?.[0]?.active;
    }

    static addAttribute(event, target) {
        let attribute = target.dataset.attribute;
        let attributes = foundry.utils.getProperty(this, attribute);

        if (!attributes) return;

        // find the maximum order
        let maxOrder = 0;
        for (let attr of Object.values(attributes)) {
            maxOrder = Math.max(maxOrder, attr.order);
        }

        attributes[foundry.utils.randomID()] = { id: foundry.utils.randomID(), name: "", shown: true, full: false, order: maxOrder + 1 };

        this.render(true);
    }

    changeData(event) {
        let prop = event.currentTarget.getAttribute("name");
        if (foundry.utils.hasProperty(this, prop)) {
            let val = event.currentTarget.type == "checkbox" ? event.currentTarget.checked : event.currentTarget.value;
            foundry.utils.setProperty(this, prop, val);
        }
    }

    static removeAttribute(event, target) {
        let key = target.closest('li.item').dataset.id;

        let obj = this;
        let parts = key.split('.');
        for (let i = 0; i < parts.length; i++) {
            let p = parts[i];
            const t = getType(obj);
            if (!((t === "Object") || (t === "Array"))) break;
            if (i === parts.length - 1) {
                delete obj[p];
                break;
            }
            if (p in obj) obj = obj[p];
            else {
                obj = undefined;
                break;
            }
        }

        this.render(true);
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

            let property = event.target.dataset.attribute;
            let attributes = foundry.utils.getProperty(this, property);

            let from = (foundry.utils.getProperty(this, data.id) || {}).order ?? 0;
            let to = (foundry.utils.getProperty(this, target.dataset.id) || {}).order ?? 0;
            log('from', from, 'to', to);

            const draggedElement = this.element.querySelector(`.item-list .item[data-id="${data.id}"]`);
            if (from < to) {
                for (let attr of Object.values(attributes)) {
                    if (attr.order > from && attr.order <= to) {
                        attr.order--;
                    }
                }
                target.after(draggedElement);
            } else {
                for (let attr of Object.values(attributes)) {
                    if (attr.order < from && attr.order >= to) {
                        attr.order++;
                    }
                }
                target.before(draggedElement);
            }
            (foundry.utils.getProperty(this, data.id) || {}).order = to;
        }
    }

    static async #onSubmit(event, form, formData) {
        await game.settings.set("monks-enhanced-journal", "sheet-settings", this.sheetSettings, { diff: false });
    }

    static async onResetDefaults(event, target) {
        let sheetSettings = game.settings.settings.get("monks-enhanced-journal.sheet-settings");
        await game.settings.set("monks-enhanced-journal", "sheet-settings", sheetSettings.default);
        this.sheetSettings = sheetSettings.default;

        this.render(true);
    }
}