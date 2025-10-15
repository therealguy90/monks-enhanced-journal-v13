import { SlideConfig } from "../apps/slideconfig.js";
import { setting, i18n, log, makeid, MonksEnhancedJournal } from "../monks-enhanced-journal.js";
import { EnhancedJournalSheet } from "../sheets/EnhancedJournalSheet.js";

export let createSlideThumbnail = (src) => {
    return SlideshowSheet.createSlideThumbnail(src);
}

export class SlideshowSheet extends EnhancedJournalSheet {
    constructor(data, options) {
        super(data, options);

        if (options.play)
            this.playSlideshow();
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: i18n("MonksEnhancedJournal.slideshow"),
            template: "modules/monks-enhanced-journal/templates/sheets/slideshow.html",
            tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "entry-details" }],
            dragDrop: [
                { dragSelector: ".slide", dropSelector: ".slide" },
                { dragSelector: ".slide", dropSelector: ".slideshow-body" },
                { dragSelector: ".sheet-icon", dropSelector: "#board" }
            ],
            scrollY: [".tab.entry-details .tab-inner", ".tab.slides .tab-inner"]
        });
    }

    static get type() {
        return 'slideshow';
    }

    static get defaultObject() {
        return { state: 'stopped', slides: [] };
    }

    async getData() {
        let data = await super.getData();

        if (this.object._thumbnails == undefined && (game.user.isGM || this.object.testUserPermission(game.user, "OBSERVER")))
            this.loadThumbnails();

        data.fontOptions = foundry.utils.mergeObject({ "": "" }, MonksEnhancedJournal.fonts);

        let flags = (data.data.flags["monks-enhanced-journal"]);
        if (flags == undefined) {
            data.data.flags["monks-enhanced-journal"] = {};
            flags = (data.data.flags["monks-enhanced-journal"]);
        }
        data.showasOptions = { canvas: i18n("MonksEnhancedJournal.Canvas"), fullscreen: i18n("MonksEnhancedJournal.FullScreen"), window: i18n("MonksEnhancedJournal.Window") };
        if (flags.state == undefined)
            flags.state = 'stopped';
        data.playing = (flags.state != 'stopped') || !this.object.isOwner;

        data.effectOptions = MonksEnhancedJournal.effectTypes;

        const playlists = game.playlists.map(doc => {
            return { id: doc.id, name: doc.name };
        });
        playlists.sort((a, b) => a.name.localeCompare(b.name));
        data.playlists = playlists;

        let idx = 0;
        if (flags.slides) {
            let changed = false;
            let slides = foundry.utils.duplicate(flags.slides);
            for (let slide of slides) {
                if (slide.text != undefined && slide.texts == undefined) {
                    changed = true;
                    slide.texts = [];
                    if (slide.text.content != '') {
                        slide.texts.push({
                            id: makeid(),
                            width: 100,
                            top: (slide.text?.valign == 'top' ? 10 : (slide.text?.valign == 'middle' ? 40 : 80)),
                            left: 0,
                            align: slide.text?.align,
                            background: slide.text?.background,
                            fadein: 0,
                            fadeout: null,
                            color: slide.text?.color,
                            text: slide.text?.content
                        });
                    }
                }
            }
            if (changed) {
                this.object.setFlag("monks-enhanced-journal", "slides", slides);
                flags.slides = slides;
            }

            let windowSize = 25;
            let windowFont = $(".window-content").css('font-family');

            data.slides = flags.slides.map(s => {
                let slide = foundry.utils.duplicate(s);

                slide.thumbnail = s.img ? (this.object._thumbnails && this.object._thumbnails[slide.id]) || "/modules/monks-enhanced-journal/assets/loading.gif" : ""; //slide.img;

                if (slide.background?.color == '' && slide.thumbnail)
                    slide.background = `background-image:url(\'${slide.thumbnail}\');`;
                else
                    slide.background = `background-color:${slide.background.color || "#ffffff"}`;

                slide.texts = slide.texts.map(t => {
                    let text = foundry.utils.duplicate(t);
                    let bgcolor = Color.from(t.background || '#000000');
                    let color = t.color || foundry.utils.getProperty(flags, "font.color") || '#FFFFFF';
                    let font = t.font || foundry.utils.getProperty(flags, "font.name") || windowFont;
                    let size = t.size || foundry.utils.getProperty(flags, "font.size") || windowSize;
                    size = (size  / windowSize) * 100;
                    let style = {
                        color,
                        'font-size': size + "%",
                        'font-family': font,
                        'background-color': bgcolor.toRGBA(t.opacity != undefined ? t.opacity : 0.5),
                        'text-align': (t.align == 'middle' ? 'center' : t.align),
                        top: (t.top || 0) + "%",
                        left: (t.left || 0) + "%",
                        right: (t.right || 0) + "%",
                        bottom: (t.bottom || 0) + "%",
                    };
                    text.style = Object.entries(style).filter(([k, v]) => v).map(([k, v]) => `${k}:${v}`).join(';');
                    return text;
                });

                return slide;
            });

            if (flags.slideAt && flags.slideAt < data.slides.length)
                data.slides[flags.slideAt].active = true;
        }

        if (flags.state !== 'stopped' && data.slides) {
            data.slideshowing = data.slides[flags.slideAt];

            if (data.slideshowing.transition?.duration > 0) {
                let time = data.slideshowing.transition.duration * 1000;
                let timeRemaining = time - ((new Date()).getTime() - data.slideshowing.transition.startTime);
                data.slideshowing.durprog = (timeRemaining / time) * 100;
            } else
                data.slideshowing.durlabel = i18n("MonksEnhancedJournal.ClickForNext");
        }

        return data;
    }

    get canPlaySound() {
        return false;
    }

    async _render(force, options = {}) {
        await super._render(force, options);

        if (!this.object.testUserPermission(game.user, "OWNER") || options.play) {
            this.playSlideshow();
        }
    }

    static async createSlideThumbnail(src) {
        if (!src) return null;
        try {
            if (VideoHelper.hasVideoExtension(src)) {
                const t = await ImageHelper.createThumbnail(src, { format: "image/jpeg", quality: 0.5, width: 200, height: 150 });

                return t.thumb;
            } else {
                const texture = await loadTexture(src);
                let sprite = PIXI.Sprite.from(texture);

                // Reduce to the smaller thumbnail texture
                let ratio = 400 / sprite.width;
                let width = sprite.width * ratio;
                let height = sprite.height * ratio;
                const reduced = ImageHelper.compositeCanvasTexture(sprite, { width: width, height: height });
                const thumb = ImageHelper.textureToImage(reduced, { format: "image/jpeg", quality: 0.5 });
                reduced.destroy(true);

                return thumb;
            }
        } catch (err) {
            log('error', err);
        }

        return null;
    }

    async loadThumbnails() {
        this.object._thumbnails = {};
        for (let slide of this.object.flags["monks-enhanced-journal"].slides || []) {
            this.object._thumbnails[slide.id] = await SlideshowSheet.createSlideThumbnail(slide.img);
            if (this.object._thumbnails[slide.id]) {
                $(`.slide[data-slide-id="${slide.id}"] .slide-image`).attr('src', this.object._thumbnails[slide.id]);
                if (slide.background?.color == '')
                    $(`.slide[data-slide-id="${slide.id}"] .slide-background div`).css({ 'background-image': `url('${this.object._thumbnails[slide.id]}')` });
            }
        }
    }

    _documentControls() {
        let ctrls = [
            { id: 'add', text: i18n("MonksEnhancedJournal.AddSlide"), icon: 'fa-plus', conditional: game.user.isGM || this.object.isOwner, callback: this.addSlide },
            { id: 'clear', text: i18n("MonksEnhancedJournal.ClearAll"), icon: 'fa-dumpster', conditional: game.user.isGM || this.object.isOwner, callback: this.deleteAll },
         ];
        ctrls = ctrls.concat(super._documentControls());
        return ctrls;
    }

    async refresh() {
        super.refresh();
        if ((this.object.flags['monks-enhanced-journal'].state != 'stopped') || !this.object.isOwner) {
            this.playSlide();
        }
    }

    activateListeners(html, enhancedjournal) {
        super.activateListeners(html, enhancedjournal);

        const slideshowOptions = this._getSlideshowContextOptions();
        Hooks.call(`getMonksEnhancedJournalSlideshowContext`, html, slideshowOptions);
        if (slideshowOptions) new ContextMenu($(html), ".slideshow-body .slide-inner", slideshowOptions);

        let that = this;
        html.find('.slideshow-body .slide')
            .click(this.activateSlide.bind(this))
            .dblclick(function (event) {
                let id = event.currentTarget.dataset.slideId;
                that.editSlide(id);
            });
        html.find('.slide-showing').click(this.advanceSlide.bind(this, 1)).contextmenu(this.advanceSlide.bind(this, -1));

        new ResizeObserver(() => {
            //change font size to match height
            let size = ($('.slide-showing .slide-textarea', html).outerWidth() || 182) / 50;
            $('.slide-showing .slide-textarea', html).css({ 'font-size': `${size}px`});
        }).observe(this.element[0]);

        $('.add-slide', html).click(this.addSlide.bind(this));
        $('.nav-button.play').click(this.playSlideshow.bind(this));
        $('.nav-button.pause').click(this.pauseSlideshow.bind(this));
        $('.nav-button.stop').click(this.stopSlideshow.bind(this));

        let size = ($('.slideshow-body .slide-textarea', html).outerWidth() || 182) / 50;
        $('.slideshow-body .slide-textarea', html).css({ 'font-size': `${size}px` });
    }

    async close(options) {
        this.stopSlideshow();
        return super.close(options);
    }

    _canDragDrop(selector) {
        return (game.user.isGM || this.object.isOwner);
    }

    _onDragStart(event) {
        if ($(event.currentTarget).hasClass("sheet-icon"))
            return super._onDragStart(event);

        const li = event.currentTarget;

        const dragData = { from: this.object.uuid };

        let id = li.dataset.slideId;
        dragData.slideId = id;
        dragData.type = "Slide";

        log('Drag Start', dragData);

        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        MonksEnhancedJournal._dragItem = id;
    }

    _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        }
        catch (err) {
            return false;
        }

        if (this.object.flags["monks-enhanced-journal"].state == 'playing')
            return;

        let slides = foundry.utils.duplicate(this.object.flags['monks-enhanced-journal']?.slides || []);

        let from = slides.findIndex(a => a.id == data.slideId);
        let to = slides.length - 1;
        if (!$(event.target).hasClass('slideshow-body')) {
            const target = event.target.closest(".slide") || null;
            if (data.slideId === target.dataset.slideId) return; // Don't drop on yourself
            to = slides.findIndex(a => a.id == target.dataset.slideId);
        }
        if (from == to)
            return;

        slides.splice(to, 0, slides.splice(from, 1)[0]);

        this.object.flags['monks-enhanced-journal'].slides = slides;
        this.object.setFlag('monks-enhanced-journal', 'slides', slides);

        //$('.slideshow-body .slide[data-slide-id="' + data.slideId + '"]', this.element).insertBefore(target);

        log('drop data', from, to, event, data);

        event.stopPropagation();
    }

    addSlide(data = {}, options = { showdialog: true }) {
        if (this.object.flags["monks-enhanced-journal"].slides == undefined)
            this.object.flags["monks-enhanced-journal"].slides = [];

        let slide = foundry.utils.mergeObject({
            sizing: 'contain',
            background: { color: '' },
            texts: [],//{ color: '#FFFFFF', background: '#000000', align: 'center', valign: 'middle' },
            transition: { duration: 5, effect: 'fade' }
        }, (data instanceof Event || data?.originalEvent instanceof Event ? {} : data));
        

        if (options.showdialog)
            new SlideConfig(slide, this.object).render(true);
        else {
            let slides = foundry.utils.duplicate(this.object.flags["monks-enhanced-journal"].slides || []);
            slide.id = makeid();
            slides.push(slide);
            this.object.setFlag("monks-enhanced-journal", 'slides', slides);

            let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.object, "flags.monks-enhanced-journal"));
            let size = $('.slide-textarea', newSlide).outerWidth() / 50;
            $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });
        }
    }

    deleteAll() {
        if (this.object.flags["monks-enhanced-journal"].state != 'stopped')
            return ui.notifications.warn("Can't clear slides when a slideshow is playing");

        Dialog.confirm({
            title: "Clear Slides",
            content: "Are you sure want to clear all slides?",
            yes: () => {
                this.object.setFlag("monks-enhanced-journal", 'slides', []);
                //$(`.slideshow-body`, this.element).empty();
                //MonksEnhancedJournal.journal.saveData();
            },
            defaultYes: true
        });
    }

    deleteSlide(id, html) {
        let slides = foundry.utils.duplicate(this.object.flags["monks-enhanced-journal"].slides || []);
        slides.findSplice(s => s.id == id);
        this.object.setFlag("monks-enhanced-journal", 'slides', slides);
    }

    cloneSlide(id) {
        let slide = this.object.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        let data = foundry.utils.duplicate(slide);
        this.addSlide(data, { showdialog: false });
    }

    editSlide(id, options) {
        let slide = this.object.flags["monks-enhanced-journal"].slides.find(s => s.id == id);
        if (slide != undefined)
            new SlideConfig(slide, this.object, options).render(true);
    }

    activateSlide(event) {
        if (this.object.flags["monks-enhanced-journal"].state != 'stopped') {
            let idx = $(event.currentTarget).index();
            this.object.flags["monks-enhanced-journal"].slideAt = idx;
            this.playSlide(idx);
        }
    }

    _onSelectFile(selection, filePicker) {
        this.object.setFlag("monks-enhanced-journal", "audiofile", selection);
    }

    updateButtons() {
        $('.nav-button.play', this.element).toggle(this.object.flags["monks-enhanced-journal"].state !== 'playing');
        $('.nav-button.pause', this.element).toggle(this.object.flags["monks-enhanced-journal"].state === 'playing');
        $('.nav-button.stop', this.element).toggle(this.object.flags["monks-enhanced-journal"].state !== 'stopped');
    }

    async playSlideshow(refresh = true) {
        let flags = this.object.flags["monks-enhanced-journal"];
        if (flags.slides.length == 0) {
            ui.notifications.warn(i18n("MonksEnhancedJournal.CannotPlayNoSlides"));
            return;
        }

        if (flags.state == 'playing')
            return;
        let currentlyPlaying;
        if (flags.state == 'stopped') {
            if (this.object.isOwner)
                await this.object.setFlag("monks-enhanced-journal", "slideAt", 0);
            else
                this.object.flags['monks-enhanced-journal'].slideAt = 0;
            this.object.sound = undefined;

            if (flags.audiofile != undefined && flags.audiofile != '') {
                let volume = flags.volume ?? 1;
                foundry.audio.AudioHelper.play({
                    src: flags.audiofile,
                    loop: flags.loopaudio,
                    volume: volume //game.settings.get("core", "globalInterfaceVolume")
                }).then((sound) => {
                    this.object.sound = sound;
                    MonksEnhancedJournal.sounds.push(sound);
                    sound.effectiveVolume = volume;
                    return sound;
                });
            }
            if (flags.pauseplaylist) {
                currentlyPlaying = ui.playlists._playingSounds.map(ps => ps.playing ? ps.uuid : null).filter(p => !!p);
                for (let playing of currentlyPlaying) {
                    let sound = await fromUuid(playing);
                    sound.update({ playing: false, pausedTime: sound.sound.currentTime });
                }
            }
            if (flags.playlist != undefined) {
                let playlist = game.playlists.get(flags.playlist);
                if (playlist)
                    playlist.playAll();
            }
        } else {
            if (this.object.sound && this.object.sound.paused)
                this.object.sound.play();
        }

        let animate = (flags.state != 'paused');
        if (this.object.isOwner) {
            await this.object.setFlag("monks-enhanced-journal", "lastPlaying", currentlyPlaying);
            await this.object.setFlag("monks-enhanced-journal", "state", "playing");
        } else
            this.object.flags['monks-enhanced-journal'].state = "playing";
        $('.slide-showing .duration', this.element).show();
        ($(this.element).hasClass('slideshow-container') ? $(this.element) : $('.slideshow-container', this.element)).addClass('playing');
        this.updateButtons.call(this);

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('playSlideshow', { uuid: this.object.uuid, idx: flags.slideAt });

        if (refresh && flags.state == 'stopped')
            $('.slide-showing .slide', this.element).remove();
        //add a loading slide
        $('<div>').addClass('loading-slide slide').appendTo($('.slide-showing', this.element));

        this.playSlide(flags.slideAt, animate);
        //this.object.update({ 'flags.monks-enhanced-journal': this.object.flags["monks-enhanced-journal"] });
    }

    async pauseSlideshow() {
        let flags = this.object.flags["monks-enhanced-journal"];
        let slide = flags.slides[flags.slideAt];
        if (slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        $('.slide-showing .duration', this.element).hide().stop();

        if (this.object?._currentSlide?.transition?.timer)
            window.clearTimeout(this.object?._currentSlide?.transition?.timer);

        if(this.object.isOwner)
            await this.object.setFlag("monks-enhanced-journal", "state", "paused");
        else
            this.object.flags['monks-enhanced-journal'].state = "paused";
        this.updateButtons.call(this);

        if (this.object.slidesound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideAudio");
            this.object.slidesound.stop();
            delete this.object.slidesound;
        }
    }

    async stopSlideshow() {
        let flags = this.object.flags["monks-enhanced-journal"];
        let slide = flags.slides[flags.slideAt];
        if (slide && slide.transition.timer)
            window.clearTimeout(slide.transition.timer);

        if (this.object.isOwner) {
            await this.object.setFlag("monks-enhanced-journal", "state", "stopped");
            await this.object.setFlag("monks-enhanced-journal", "slideAt", 0);
        } else {
            this.object.flags['monks-enhanced-journal'].state = "stopped";
            this.object.flags['monks-enhanced-journal'].slideAt = 0;
        }

        $('.slide-showing .duration', this.element).hide().stop();
        if (this.object.isOwner) {
            $('.slide-showing .slide', this.element).remove();
            ($(this.element).hasClass('slideshow-container') ? $(this.element) : $('.slideshow-container', this.element)).removeClass('playing');
        }
        this.updateButtons.call(this);

        if (this.object.sound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideshowAudio");
            this.object.sound.stop();
            this.object.sound = undefined;
        }
        if (this.object.slidesound?.src != undefined) {
            if (game.user.isGM)
                MonksEnhancedJournal.emit("stopSlideAudio");
            this.object.slidesound.stop();
            this.object.slidesound = undefined;
        }

        if (this.object.isOwner) {
            if (this.object.flags['monks-enhanced-journal'].playlist) {
                let playlist = game.playlists.get(this.object.flags['monks-enhanced-journal'].playlist);
                if (playlist && playlist.playing)
                    playlist.stopAll();
            }
            if (this.object.flags['monks-enhanced-journal'].lastPlaying) {
                for (let playing of this.object.flags['monks-enhanced-journal'].lastPlaying) {
                    let sound = await fromUuid(playing);
                    if (sound)
                        sound.parent?.playSound(sound);
                }
                this.object.unsetFlag("monks-enhanced-journal", "currentlyPlaying");
            }
        }

        //inform players
        if(game.user.isGM)
            MonksEnhancedJournal.emit('stopSlideshow', {});

        //++++ why am I doing it this way and not using setFlag specifically?
        //this.object.update({ 'flags.monks-enhanced-journal': this.object.flags["monks-enhanced-journal"] });
    }

    showSlide() {
        let idx = this.object.flags["monks-enhanced-journal"].slideAt;
        let slide = this.object.flags["monks-enhanced-journal"].slides[idx];
        let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.object, "flags.monks-enhanced-journal"));
        $('.slide-showing', this.element).append(newSlide);
        let size = $('.slide-textarea', newSlide).outerWidth() / 50;
        $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });
    }

    playSlide(idx, animate = true) {
        let that = this;
        if (idx == undefined)
            idx = this.object.flags["monks-enhanced-journal"].slideAt || 0;
        else { //if (idx != this.object.flags["monks-enhanced-journal"].slideAt)
            if (this.object.isOwner)
                this.object.setFlag("monks-enhanced-journal", "slideAt", idx);
            else
                this.object.flags['monks-enhanced-journal'].slideAt = idx;
        }

        let slides = this.object.flags["monks-enhanced-journal"].slides;
        idx = Math.clamp(idx, 0, slides.length - 1);

        let slide = this.object.flags["monks-enhanced-journal"].slides[idx];
        if (slide == undefined) {
            this.stopSlideshow();
            return;
        }

        //remove any that are still on the way out
        $('.slide-showing .slide.out', this.element).remove();

        let effect = (slide.transition?.effect == 'fade' ? null : slide.transition?.effect) || this.object.flags['monks-enhanced-journal'].transition?.effect || 'none';

        //remove any old slides
        $('.slide-showing .slide', this.element).addClass('out');

        //bring in the new slide
        let newSlide = MonksEnhancedJournal.createSlide(slide, foundry.utils.getProperty(this.object, "flags.monks-enhanced-journal"));
        $('.slide-showing', this.element).append(newSlide);
        let size = $('.slide-showing', this.element).outerWidth() / 50;
        $('.slide-textarea', newSlide).css({ 'font-size': `${size}px` });

        var img = $('.slide-image', newSlide);

        function loaded() {
            newSlide.removeClass('loading');
            $('.slide-showing .loading-slide', this.element).remove();
            if (animate && effect != 'none' && $('.slide-showing .slide.out', that.element).length) {
                let realeffect = effect;
                if (effect == 'slide-bump-left') {
                    realeffect = 'slide-slide-left';
                    $('.slide-showing .slide.out', that.element).addClass('slide-slide-out-right');
                } else if (effect == 'slide-bump-right') {
                    realeffect = 'slide-slide-right';
                    $('.slide-showing .slide.out', that.element).addClass('slide-slide-out-left');
                } else if (effect == 'slide-flip') {
                    realeffect = 'slide-flip-in';
                    $('.slide-showing .slide.out', that.element).addClass('slide-flip-out');
                } else if (effect == 'slide-page-turn') {
                    realeffect = '';
                    $('.slide-showing .slide.out', that.element).addClass('slide-page-out');
                    newSlide.css({ opacity: 1 });
                }
                newSlide.addClass(realeffect).on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function (evt) {
                    if ($(evt.target).hasClass('slide')) {
                        $('.slide-showing .slide.out', that.element).remove();
                        newSlide.removeClass(realeffect);
                        if (that.object.slidesound?.src != undefined) {
                            if (game.user.isGM)
                                MonksEnhancedJournal.emit("stopSlideAudio");
                            that.object.slidesound.stop();
                            that.object.slidesound = undefined;
                        }
                        if (slide.audiofile != undefined && slide.audiofile != '') {
                            let volume = slide.volume ?? 1;
                            foundry.audio.AudioHelper.play({
                                src: slide.audiofile,
                                loop: false,
                                volume: volume //game.settings.get("core", "globalInterfaceVolume")
                            }).then((sound) => {
                                that.object.slidesound = sound;
                                MonksEnhancedJournal.sounds.push(sound);
                                sound.effectiveVolume = volume;
                                return sound;
                            });
                        }
                    }
                });
            } else {
                newSlide.css({ opacity: 1 });
                $('.slide-showing .slide.out', this.element).remove();
                if (that.object.slidesound?.src != undefined) {
                    if (game.user.isGM)
                        MonksEnhancedJournal.emit("stopSlideAudio");
                    that.object.slidesound.stop();
                    that.object.slidesound = undefined;
                }
                if (slide.audiofile != undefined && slide.audiofile != '') {
                    let volume = slide.volume ?? 1;
                    foundry.audio.AudioHelper.play({
                        src: slide.audiofile,
                        loop: false,
                        volume: volume //game.settings.get("core", "globalInterfaceVolume")
                    }).then((sound) => {
                        that.object.slidesound = sound;
                        MonksEnhancedJournal.sounds.push(sound);
                        sound.effectiveVolume = volume;
                        return sound;
                    });
                }
            }

            $(`.slideshow-body .slide:eq(${idx})`, this.element).addClass('active').siblings().removeClass('active');
            $('.slideshow-body', this.element).scrollLeft((idx * 116));
            $('.slide-showing .duration', this.element).empty();

            if (this.object?._currentSlide?.transition?.timer)
                window.clearTimeout(this.object?._currentSlide?.transition?.timer);

            let duration = slide.transition?.duration || this.object.flags['monks-enhanced-journal'].transition?.duration || 0;
            duration = parseFloat(duration);
            if (isNaN(duration) || duration <= 0) {
                $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-label').html(i18n("MonksEnhancedJournal.ClickForNext")));
            } else {
                duration = Math.min(duration, )
                //set up the transition
                let time = duration * 1000;
                slide.transition.startTime = (new Date()).getTime();
                slide.transition.timer = window.setTimeout(function () {
                    if (that.object.getFlag("monks-enhanced-journal", "state") == 'playing')
                        that.advanceSlide.call(that, 1);
                }, time);
                $('.slide-showing .duration', this.element).append($('<div>').addClass('duration-bar').css({ width: '0' }).show().animate({ width: '100%' }, time, 'linear'));
            }

            for (let text of slide.texts) {
                if ($.isNumeric(text.fadein)) {
                    let fadein = text.fadein + (effect != 'none' ? 1 : 0);
                    $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element)
                        .css({ 'animation-delay': fadein + 's' })
                        .addClass('text-fade-in')
                        .on('animationend webkitAnimationEnd oAnimationEnd MSAnimationEnd', function () {
                            if ($.isNumeric(text.fadeout)) {
                                $(this).css({ 'animation-delay': text.fadeout + 's' }).removeClass('text-fade-in').addClass('text-fade-out');
                            }
                        });
                } else if ($.isNumeric(text.fadeout)) {
                    let fadeout = ($.isNumeric(text.fadein) ? text.fadein : 0) + (effect != 'none' ? 1 : 0) + text.fadeout;
                    $('.slide-showing .slide-text[data-id="' + text.id + '"]', MonksEnhancedJournal.slideshow?.element).css({ 'animation-delay': fadeout + 's' }).addClass('text-fade-out');
                }
            }

            this.object._currentSlide = slide;

            if (game.user.isGM)
                MonksEnhancedJournal.emit('playSlide', { uuid: this.object.uuid, idx: idx });
        }

        if (img[0].complete || !img[0].paused) {
            loaded.call(this);
        } else {
            //img.on('play', loaded.bind(this));
            img.on('load', loaded.bind(this));
            img.on('loadeddata', loaded.bind(this));
            img.on('error', () => {
                loaded.call(this);
            })
        }
    }

    advanceSlide(dir, event) {
        let data = this.object.flags["monks-enhanced-journal"];
        data.slideAt = Math.max(data.slideAt + dir, 0);

        if (data.slideAt < 0)
            data.slideAt = 0;
        else if (data.slideAt >= data.slides.length) {
            if (data.loop === true) {
                data.slideAt = 0;
                this.playSlide(0, true);
            }
            else
                this.stopSlideshow();
        }
        else
            this.playSlide(data.slideAt, dir > 0);
    }

    _getSlideshowContextOptions() {
        return [
            {
                name: "MonksEnhancedJournal.EditSlide",
                icon: '<i class="fas fa-edit"></i>',
                condition: game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.object.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    //const options = { top: li[0].offsetTop, left: window.innerWidth - SlideConfig.defaultOptions.width };
                    this.editSlide(id); //, options);
                }
            },
            {
                name: "SIDEBAR.Duplicate",
                icon: '<i class="far fa-copy"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    //const slide = this.object.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    return this.cloneSlide(id);
                }
            },
            {
                name: "SIDEBAR.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: () => game.user.isGM,
                callback: elem => {
                    let li = $(elem).closest('.slide');
                    const id = li.data("slideId");
                    const element = li instanceof HTMLElement ? li : (li?.[0] || li);
                    //const slide = this.object.flags["monks-enhanced-journal"].slides.get(li.data("entityId"));
                    Dialog.confirm({
                        title: `${game.i18n.localize("SIDEBAR.Delete")} slide`,
                        content: game.i18n.format("SIDEBAR.DeleteWarning", { type: 'slide' }),
                        yes: this.deleteSlide.bind(this, id),
                        options: {
                            top: Math.min(element?.offsetTop || 0, window.innerHeight - 350),
                            left: window.innerWidth - 720
                        }
                    });
                }
            }
        ];
    }
}

Hooks.on("renderSlideshowSheet", (sheet, html, data) => {
    if (sheet.object.flags['monks-enhanced-journal'].state != 'stopped') {
        sheet.playSlide();
    } else if (!sheet.object.isOwner) {
        sheet.showSlide();
    }
});
