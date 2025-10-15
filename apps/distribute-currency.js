import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class DistributeCurrency extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    original = {};
    characters = [];
    currency = {};
    totals = {};

    constructor(characters, currency, loot, options = {}) {
        super(options);

        this.loot = loot;
        this.currency = currency;
        this.original = foundry.utils.duplicate(currency);
        this.totals = foundry.utils.duplicate(currency);
        let playercurrency = foundry.utils.duplicate(currency);
        for (let curr of Object.keys(currency))
            playercurrency[curr] = 0;
        this.characters = characters.map(c => {
            return {
                id: c.id,
                name: c.name,
                img: c.img,
                currency: foundry.utils.duplicate(playercurrency)
            }
        });

        this.currencies = MonksEnhancedJournal.currencies;

        if (setting("loot-auto-distribute"))
            this.splitCurrency();

    }

    /** @override */
    static DEFAULT_OPTIONS = {
        id: "distribute-currency",
        classes: ["distribute-currency", "monks-journal-sheet", "dialog"],
        tag: "form",
        form: {
            handler: DistributeCurrency.#onSubmit,
            closeOnSubmit: true,
            submitOnChange: false
        },
        position: {
            width: 600,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.DistributeCurrency",
            contentClasses: ["standard-form"]
        },
        actions: {
            split: DistributeCurrency.splitCurrency,
            reset: DistributeCurrency.resetData,
            assign: DistributeCurrency.assignCurrency
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/distribute-currency.hbs"
        }
    };

    _prepareContext(options) {
        return foundry.utils.mergeObject(super._prepareContext(options),
            {
                characters: this.characters,
                currencies: this.currencies,
                currency: this.currency,
                totals: this.totals
            }
        );
    }

    calcTotal(currencies) {
        if (currencies == undefined)
            currencies = Object.keys(this.currency);
        else
            currencies = [currencies];
        for (let curr of currencies) {
            this.totals[curr] = this.currency[curr];
            for (let character of this.characters) {
                if (character.currency[curr] !== "")
                    this.totals[curr] = this.totals[curr] + character.currency[curr];
            }
        }
    }

    static resetData(event, target) {
        this.currency = foundry.utils.duplicate(this.original);
        for (let character of this.characters) {
            for (let curr of Object.keys(character.currency)) {
                character.currency[curr] = 0;
            }
        }

        this.calcTotal();

        this.render(true);
    }

    updateAmount(event) {
        let curr = event.currentTarget.dataset.currency;
        let charId = event.currentTarget.dataset.character;

        if (charId == undefined)
            this.currency[curr] = parseInt(event.currentTarget.value || 0);
        else {
            let character = this.characters.find(c => c.id == charId);
            let value = event.currentTarget.value;
            if (value === "")
                character.currency[curr] = "";
            else
                character.currency[curr] = parseInt(value);
        }

        this.calcTotal();

        this.render(true);
    }

    static splitCurrency(event, target) {
        for (let curr of Object.keys(this.currency)) {
            if (this.currency[curr] == 0)
                continue;
            let characters = this.characters.filter(c => {
                return c.currency[curr] !== "";
            });
            if (characters.length == 0)
                continue;
            let part = Math.floor(this.currency[curr] / characters.length);
            for (let character of characters) {
                character.currency[curr] = character.currency[curr] + part;
            }

            this.currency[curr] = this.currency[curr] - (part * characters.length);
            if (setting("distribute-conversion") && this.currency[curr] > 0) {
                //find the next lower currency
                let idx = this.currencies.findIndex(c => c.id == curr);
                let newIdx = idx + 1;
                if (newIdx < this.currencies.length && this.currencies[newIdx].convert != undefined) {
                    //convert to default
                    let convVal = this.currency[curr] * (this.currencies[idx].convert || 1);
                    convVal = convVal / (this.currencies[newIdx].convert || 1);
                    this.currency[curr] = 0;
                    this.currency[this.currencies[newIdx].id] = this.currency[this.currencies[newIdx].id] + convVal;
                }
            }
        }

        this.calcTotal();

        this.render(true);
    }

    static assignCurrency(event, target) {
        let charId = target.dataset.character;

        let character = this.characters.find(c => c.id == charId);
        for (let curr of Object.keys(this.totals)) {
            character.currency[curr] = (character.currency[curr] || 0) + this.currency[curr];
            this.currency[curr] = 0;
        }

        this.calcTotal();

        this.render(true);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const playerAmounts = this.element.querySelectorAll('input.player-amount');
        const currencyAmounts = this.element.querySelectorAll('input.currency-amount');
        
        playerAmounts.forEach(input => {
            input.addEventListener('change', this.updateAmount.bind(this));
        });
        currencyAmounts.forEach(input => {
            input.addEventListener('change', this.updateAmount.bind(this));
        });
    }

    static async #onSubmit(event, form, formData) {
        this.loot.doSplitMoney(this.characters, this.currency);
    }
}