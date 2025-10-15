import { MonksEnhancedJournal, log, setting, i18n, makeid } from '../monks-enhanced-journal.js';
import { SlideText } from "../apps/slidetext.js";
import { createSlideThumbnail } from "../sheets/SlideshowSheet.js";

export class SlideConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, journalentry, options = {}) {
        super(options);
        this.object = object;
        this.journalentry = journalentry;
    }

    static DEFAULT_OPTIONS = {
        id: "slide-config",
        classes: ["slide-sheet"],
        tag: "form",
        form: {
            handler: SlideConfig.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 620,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.SlideConfiguration",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/sheets/slideconfig.hbs"
        }
    };

    get slideid() {
        return this.object.id || 'new';
    }

    _prepareContext(options) {
        let data = super._prepareContext(options);

        data.sizingOptions = {
            contain: "MonksEnhancedJournal.Contain",
            cover: "MonksEnhancedJournal.Cover",
            fill: "MonksEnhancedJournal.Stretch"
        };
        data.effectOptions = Object.assign({ '': i18n("MonksEnhancedJournal.InheritFromSlideshow")}, MonksEnhancedJournal.effectTypes);

        let windowSize = 25;
        let windowFont = getComputedStyle(document.querySelector(".window-content"))?.fontFamily || "sans-serif";

        data.texts = this.object.texts.map(t => {
            let text = foundry.utils.duplicate(t);
            let x = (((t.left || 0) / 100) * 600).toFixed(2);
            let y = (((t.top || 0) / 100) * 400).toFixed(2);
            let x2 = (((t.right || 0) / 100) * 600).toFixed(2);
            let y2 = (((t.bottom || 0) / 100) * 400).toFixed(2);
            let bgcolor = Color.from(t.background || '#000000');
            let color = t.color || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF";
            let font = t.font || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.name") || windowFont;
            let size = t.size || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize;
            size = (size / windowSize) * 100;
            let style = {
                'font-size': size + "%",
                'font-family': font,
                color,
                'background-color': bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                'text-align': (t.align == 'middle' ? 'center' : t.align),
                top: y + "px",
                left: x + "px",
                width: (600 - x2 - x) + "px",
                height: (400 - y2 - y) + "px",
            };
            text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
            return text;
        });

        data.volume = this.object.volume ?? 1;

        data.thumbnail = (this.journalentry._thumbnails && this.object.id && this.journalentry._thumbnails[this.object.id]) || this.object.img;

        if (this.object.background?.color == '') {
            if (data.thumbnail)
                data.background = `background-image:url(\'${data.thumbnail}\');`;
            else
                data.background = `background-color:rgba(255, 255, 255, 0.5)`;
        }
        else
            data.background = `background-color:${this.object.color}`;

        return data;
    }

    _getSubmitData() {
        const formElement = this.element.querySelector('form');
        const formData = new FormDataExtended(formElement);
        let data = foundry.utils.expandObject(formData.object);

        let texts = this.object.texts;

        this.element.querySelectorAll('.slide-text').forEach((elem) => {
            let text = texts.find(t => t.id == elem.dataset.id);
            let rect = elem.getBoundingClientRect();
            let parentRect = elem.parentElement.getBoundingClientRect();
            let pos = { left: rect.left - parentRect.left, top: rect.top - parentRect.top };
            text.left = (pos.left / 600) * 100;
            text.top = (pos.top / 400) * 100;
            text.right = ((600 - (pos.left + elem.offsetWidth)) / 600) * 100;
            text.bottom = ((400 - (pos.top + elem.offsetHeight)) / 400) * 100;
            text.text = elem.value;
        });

        data.texts = texts;

        return foundry.utils.flattenObject(data);
    }

    static async #onSubmit(event, form, formData) {
        const data = this._getSubmitData();
        log('updating slide', event, data, this.object);
        let slides = foundry.utils.duplicate(this.journalentry.flags["monks-enhanced-journal"].slides || []);

        if (this.object.id == undefined) {
            this.object.id = makeid();
            foundry.utils.mergeObject(this.object, data);
            slides.push(this.object);
            this.journalentry._thumbnails[this.slideid] = this.journalentry._thumbnails.new;
            delete this.journalentry._thumbnails.new;
        } else {
            let slide = slides.find(s => s.id == this.object.id);
            foundry.utils.mergeObject(slide, data);
        }

        await this.journalentry.setFlag('monks-enhanced-journal', 'slides', slides);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const html = this.element;
        const slideTexts = html.querySelectorAll('.slide-text');
        
        slideTexts.forEach(slideText => {
            slideText.addEventListener('mousedown', (ev) => { ev.stopPropagation(); ev.currentTarget.focus(); });
            slideText.addEventListener('dblclick', this.editText.bind(this));
            slideText.addEventListener('focus', this.selectText.bind(this));
            slideText.addEventListener('blur', (ev) => {
                if (ev.currentTarget.value == '')
                    this.deleteText(ev.currentTarget);
            });
        });

        const slideTextarea = html.querySelector('.slide-textarea');
        if (slideTextarea) {
            slideTextarea.addEventListener('mousedown', (ev) => {
                if (html.querySelectorAll('.slide-text.selected').length == 0) {
                    let rect = slideTextarea.getBoundingClientRect();
                    this.orig = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
                    const creator = document.createElement('div');
                    creator.className = 'text-create';
                    creator.style.left = this.orig.x + 'px';
                    creator.style.top = this.orig.y + 'px';
                    slideTextarea.appendChild(creator);
                } else {
                    this.clearText.call(this, ev);
                }
            });
            
            slideTextarea.addEventListener('mousemove', (ev) => {
                let rect = slideTextarea.getBoundingClientRect();
                let pt = { x: ev.clientX - rect.left, y: ev.clientY - rect.top};
                let mover = html.querySelector('.mover.moving');
                let creator = html.querySelector('.text-create');
                if (mover) {
                    mover.parentElement.style.left = pt.x + 'px';
                    mover.parentElement.style.top = pt.y + 'px';
                    const selected = html.querySelector('.slide-text.selected');
                    if (selected) {
                        selected.style.left = pt.x + 'px';
                        selected.style.top = pt.y + 'px';
                    }
                } else if (creator) {
                    creator.style.left = Math.min(pt.x, this.orig.x) + 'px';
                    creator.style.top = Math.min(pt.y, this.orig.y) + 'px';
                    creator.style.width = Math.abs(pt.x - this.orig.x) + 'px';
                    creator.style.height = Math.abs(pt.y - this.orig.y) + 'px';
                }
            });
            
            slideTextarea.addEventListener('mouseup', (ev) => {
                let mover = html.querySelector('.mover.moving');
                let creator = html.querySelector('.text-create');
                if (mover) {
                    mover.classList.remove('moving');
                    const selected = html.querySelector('.slide-text.selected');
                    if (selected) selected.focus();
                } else if (creator) {
                    if (creator.offsetWidth > 50 && creator.offsetHeight > 20) {
                        let rect = creator.getBoundingClientRect();
                        let parentRect = creator.parentElement.getBoundingClientRect();
                        let pos = { left: rect.left - parentRect.left, top: rect.top - parentRect.top };
                        let data = {
                            left: (pos.left / 600) * 100,
                            top: (pos.top / 400) * 100,
                            right: ((600 - (pos.left + creator.offsetWidth)) / 600) * 100,
                            bottom: ((400 - (pos.top + creator.offsetHeight)) / 400) * 100
                        };
                        this.createText(data);
                    }
                    creator.remove();
                }
            });
        }

        html.querySelectorAll('.mover').forEach(mover => {
            mover.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                mover.classList.add('moving');
            });
        });

        const imgInput = html.querySelector('input[name="img"]');
        const sizingSelect = html.querySelector('select[name="sizing"]');
        const bgColorInput = html.querySelector('input[name="background.color"]');
        const bgColorEdit = html.querySelector('input[data-edit="background.color"]');
        
        if (imgInput) imgInput.addEventListener('change', this.updateImage.bind(this));
        if (sizingSelect) sizingSelect.addEventListener('change', this.updateImage.bind(this));
        if (bgColorInput) bgColorInput.addEventListener('change', this.updateImage.bind(this));
        if (bgColorEdit) {
            bgColorEdit.addEventListener('change', () => {
                window.setTimeout(() => { this.updateImage.call(this) }, 200);
            });
        }

        if (slideTextarea) {
            let size = slideTextarea.offsetWidth / 50;
            slideTextarea.style.fontSize = `${size}px`;
        }

        const editControl = html.querySelector('.control-icon[data-action="edit"]');
        if (editControl) {
            editControl.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const selectedText = html.querySelector('.slide-text.selected');
                if (selectedText) {
                    let textId = selectedText.dataset.id;
                    let text = this.object.texts.find(t => t.id == textId);
                    new SlideText(text, this).render(true);
                }
            });
        }

        const deleteControl = html.querySelector('.control-icon[data-action="delete"]');
        if (deleteControl) {
            deleteControl.addEventListener('mousedown', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const selectedText = html.querySelector('.slide-text.selected');
                if (selectedText) this.deleteText(selectedText);
            });
        }
    }

    async updateImage() {
        const imgInput = this.element.querySelector('input[name="img"]');
        const bgColorInput = this.element.querySelector('input[name="background.color"]');
        const sizingSelect = this.element.querySelector('select[name="sizing"]');
        
        let src = imgInput?.value;
        this.journalentry._thumbnails[this.slideid] = await createSlideThumbnail(src);
        let thumbnail = this.journalentry._thumbnails[this.slideid] || src;
        
        const bgDiv = this.element.querySelector('.slide-background div');
        if (bgDiv) {
            if (bgColorInput?.value == '') {
                bgDiv.style.backgroundImage = `url(${thumbnail})`;
                bgDiv.style.backgroundColor = '';
            } else {
                bgDiv.style.backgroundImage = '';
                bgDiv.style.backgroundColor = bgColorInput?.value;
            }
        }

        const slideImage = this.element.querySelector('.slide-image');
        if (slideImage) {
            slideImage.src = thumbnail;
            slideImage.style.objectFit = sizingSelect?.value || 'contain';
        }
    }

    selectText(ev) {
        let element = ev.currentTarget;
        element.classList.add('selected');
        element.parentElement.querySelectorAll('.slide-text').forEach(sibling => {
            if (sibling !== element) sibling.classList.remove('selected');
        });
        
        const hud = this.element.querySelector('.slide-hud');
        if (hud) {
            let rect = element.getBoundingClientRect();
            let parentRect = element.parentElement.getBoundingClientRect();
            let pos = { left: rect.left - parentRect.left, top: rect.top - parentRect.top };
            hud.style.left = pos.left + 'px';
            hud.style.top = pos.top + 'px';
            hud.style.width = element.offsetWidth + 'px';
            hud.style.height = element.offsetHeight + 'px';
            hud.style.display = '';
        }
    }

    editText(ev) {
        ev.preventDefault();
        ev = ev || window.event;
        let isRightMB = false;
        if ("which" in ev) {
            isRightMB = ev.which == 3;
        } else if ("button" in ev) {
            isRightMB = ev.button == 2;
        }

        if (!isRightMB) {
            let text = this.object.texts.find(t => t.id == ev.currentTarget.dataset.id);
            new SlideText(text, this).render(true);
        }
    }

    clearText(ev) {
        this.element.querySelectorAll('.slide-textarea .slide-text.selected').forEach(el => {
            el.classList.remove('selected');
        });
        const hud = this.element.querySelector('.slide-hud');
        if (hud) hud.style.display = 'none';
    }

    createText(data) {
        let windowSize = 25;
        let windowFont = getComputedStyle(document.querySelector(".window-content"))?.fontFamily || "sans-serif";

        let text = {
            id: makeid(),
            align: 'left',
            font: '',
            size: '',
            left: data.left,
            top: data.top,
            right: data.right,
            bottom: data.bottom,
            color: '',
            background: '#000000',
            opacity: 0.5
        };
        this.object.texts.push(text);

        let x = (((text.left || 0) / 100) * 600).toFixed(2);
        let y = (((text.top || 0) / 100) * 400).toFixed(2);
        let x2 = (((text.right || 0) / 100) * 600).toFixed(2);
        let y2 = (((text.bottom || 0) / 100) * 400).toFixed(2);
        let bgcolor = Color.from(text.background || '#000000');
        let color = text.color || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF";
        let font = text.font || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.name") || windowFont;
        let size = text.size || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize;
        size = (size / windowSize) * 100;
        
        const textarea = document.createElement('textarea');
        textarea.className = 'slide-text';
        textarea.dataset.id = text.id;
        textarea.style.fontSize = size + "%";
        textarea.style.fontFamily = font;
        textarea.style.color = color;
        textarea.style.backgroundColor = bgcolor.toRGBA(text.opacity != undefined ? text.opacity : 0.5);
        textarea.style.textAlign = (text.align == 'middle' ? 'center' : text.align);
        textarea.style.top = y + "px";
        textarea.style.left = x + "px";
        textarea.style.width = (600 - x2 - x) + "px";
        textarea.style.height = (400 - y2 - y) + "px";
        
        textarea.addEventListener('mousedown', (ev) => { ev.stopPropagation(); ev.currentTarget.focus(); });
        textarea.addEventListener('dblclick', this.editText.bind(this));
        textarea.addEventListener('focus', this.selectText.bind(this));
        textarea.addEventListener('blur', (ev) => {
            if (ev.currentTarget.value == '')
                this.deleteText(ev.currentTarget);
        });
        
        const slideTextarea = this.element.querySelector('.slide-textarea');
        if (slideTextarea) {
            slideTextarea.appendChild(textarea);
            textarea.focus();
        }
    }

    refreshText(t) {
        if (t) {
            let windowSize = 25;
            let windowFont = getComputedStyle(document.querySelector(".window-content"))?.fontFamily || "sans-serif";

            let x = (((t.left || 0) / 100) * 600);
            let y = (((t.top || 0) / 100) * 400);
            let x2 = (((t.right || 0) / 100) * 600);
            let y2 = (((t.bottom || 0) / 100) * 400);
            let bgcolor = Color.from(t.background || '#000000');
            let color = t.color || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.color") || "#FFFFFF";
            let font = t.font || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.name") || windowFont;
            let size = t.size || foundry.utils.getProperty(this.journalentry, "flags.monks-enhanced-journal.font.size") || windowSize;
            size = (size / windowSize) * 100;
            
            const elem = this.element.querySelector(`.slide-text[data-id="${t.id}"]`);
            if (elem) {
                elem.style.fontSize = size + "%";
                elem.style.fontFamily = font;
                elem.style.color = color;
                elem.style.backgroundColor = bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5);
                elem.style.textAlign = (t.align == 'middle' ? 'center' : t.align);
                elem.style.top = y + "px";
                elem.style.left = x + "px";
                elem.style.width = (600 - x2 - x) + "px";
                elem.style.height = (400 - y2 - y) + "px";
            }
        }
    }

    deleteText(element) {
        if (element && element.classList?.contains('slide-text')) {
            let id = element.dataset.id;
            this.object.texts.findSplice(i => i.id == id);
            element.remove();
            const hud = this.element.querySelector('.slide-hud');
            if (hud) hud.style.display = 'none';
        }
    }
}