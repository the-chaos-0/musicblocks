// Copyright (c) 2014-19 Walter Bender
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the The GNU Affero General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// You should have received a copy of the GNU Affero General Public
// License along with this library; if not, write to the Free Software
// Foundation, 51 Franklin Street, Suite 500 Boston, MA 02110-1335 USA

// All things related to palettes

const PROTOBLOCKSCALE = 0.75;
const PALETTELEFTMARGIN = Math.floor(10 * PROTOBLOCKSCALE);
const PALETTE_SCALE_FACTOR = 0.5;
const PALETTE_WIDTH_FACTOR = 3;

function maxPaletteHeight(menuSize, scale) {
    // Palettes don't start at the top of the screen and the last
    // block in a palette cannot start at the bottom of the screen,
    // hence - 2 * menuSize.

    // var h = (windowHeight() * canvasPixelRatio()) / scale - (2 * menuSize);
    var h = windowHeight() / scale - 2 * menuSize;
    return h - (h % STANDARDBLOCKHEIGHT) + STANDARDBLOCKHEIGHT / 2;
}

function paletteBlockButtonPush(blocks, name, arg) {
    var blk = blocks.makeBlock(name, arg);
    return blk;
}

// There are several components to the palette system:
//
// (1) A palette button (in the Palettes.buttons dictionary) is a
// button that envokes a palette; The buttons have artwork associated
// with them: a bitmap and a highlighted bitmap that is shown when the
// mouse is over the button. (The artwork is found in artwork.js.)
//
// loadPaletteButtonHandler is the event handler for palette buttons.
//
// (2) A menu (in the Palettes.dict dictionary) is the palette
// itself. It consists of a title bar (with an icon, label, and close
// button), and individual containers for each protoblock on the
// menu. There is a background behind each protoblock that is part of
// the palette container.
//
// loadPaletteMenuItemHandler is the event handler for the palette menu.
const NPALETTES = 3;

function Palettes() {
    this.canvas = null;
    this.blocks = null;
    this.refreshCanvas = null;
    this.stage = null;
    this.cellSize = null;
    this.paletteWidth = 55 * PALETTE_WIDTH_FACTOR;
    this.scrollDiff = 0;
    this.originalSize = 55; // this is the original svg size
    this.trashcan = null;
    this.firstTime = true;
    this.background = null;
    this.circles = {};
    // paletteText is used for the highlighted tooltip
    this.paletteText = new createjs.Text(
        "",
        "20px Sans",
        platformColor.paletteText
    );
    this.mouseOver = false;
    this.activePalette = null;
    this.paletteObject = null;
    this.paletteVisible = false;
    this.pluginsDeleteStatus = false;
    this.visible = true;
    this.scale = 1.0;
    this.mobile = false;
    // Top of the palette
    this.top = 55 + 20 + LEADING;
    this.current = DEFAULTPALETTE;
    this.x = []; // We track x and y for each of the multipalettes
    this.y = [];
    this.showSearchWidget = null;
    this.hideSearchWidget = null;

    this.pluginMacros = {}; // some macros are defined in plugins

    if (sugarizerCompatibility.isInsideSugarizer()) {
        storage = sugarizerCompatibility.data;
    } else {
        storage = localStorage;
    }

    // The collection of palettes.
    this.dict = {};
    this.selectorButtonsOff = []; // Select between palettes
    this.selectorButtonsOn = []; // Select between palettes in their on state
    this.buttons = {}; // The toolbar button for each palette.
    this.labels = {}; // The label for each button.
    this.pluginPalettes = []; // List of palettes not in multipalette list

    this.init = function() {
        this.halfCellSize = Math.floor(this.cellSize / 2);
    };

    this.init_selectors = function() {
        for (var i = 0; i < MULTIPALETTES.length; i++) {
            this._makeSelectorButton(i);
        }
    };

    this.deltaY = function(dy) {
    };

    this._makeSelectorButton = function(i) {
        console.debug("makeSelectorButton " + i);

        if (!document.getElementById("palette")){
            let element = document.createElement("div");
            element.setAttribute("id","palette");
            element.setAttribute("style",'position: fixed; left :0px; top:'+this.top+'px');
            element.innerHTML ='<table style="float: left" bgcolor="white"><thead><tr></tr></thead><tbody></tbody></table>'
            document.body.appendChild(element);
        }
            let palette = document.getElementById("palette");
            let tr = palette.children[0].children[0].children[0]
            let td = tr.insertCell();
            td.width=1.5*this.cellSize;
            td.height=1.5*this.cellSize;
            td.appendChild(makePaletteIcons(PALETTEICONS[MULTIPALETTEICONS[i]]
                .replace(
                    "background_fill_color",
                    platformColor.selectorBackground
                )
                .replace(/stroke_color/g, platformColor.ruleColor)
                .replace(/fill_color/g, platformColor.background)
                ,1.5*this.cellSize
                ,1.5*this.cellSize))
            var listBody = palette.children[0].children[1];
            td.onmouseover = (evt) =>{
                this.showSelectionnew(i,tr);
                this.makePalettesNew(i);
            }
    };

    this.showSelectionnew = (i,tr) => {
        //selector menu design.
        for (var j = 0; j < MULTIPALETTES.length ; j++) {
            let img;
            if (j === i) {
                img = makePaletteIcons(PALETTEICONS[MULTIPALETTEICONS[j]]
                    .replace(
                        "background_fill_color",
                        platformColor.selectorSelected
                    )
                    .replace(/stroke_color/g, platformColor.ruleColor)
                    .replace(/fill_color/g, platformColor.background)
                    ,this.cellSize
                    ,this.cellSize);
            } else {
                img = makePaletteIcons(PALETTEICONS[MULTIPALETTEICONS[j]]
                    .replace(
                        "background_fill_color",
                        platformColor.selectorBackground
                    )
                    .replace(/stroke_color/g, platformColor.ruleColor)
                    .replace(/fill_color/g, platformColor.background)
                    ,this.cellSize
                    ,this.cellSize);
            }
            tr.children[j].children[0].src= img.src;
        }
    }

    this.showSelection = function(i) {
        for (var j = 0; j < this.selectorButtonsOn.length; j++) {
            if (j === i) {
                this.selectorButtonsOn[j].visible = true;
            } else {
                this.selectorButtonsOn[j].visible = false;
            }
        }

        for (var name in this.buttons) {
            if (this.buttons[name] === undefined) {
                continue;
            }

            if (this.labels[name] === undefined) {
                continue;
            }

            if (name === "search") {
                this.buttons[name].visible = true;
                this.labels[name].visible = true;
            } else if (MULTIPALETTES[i].indexOf(name) === -1) {
                this.buttons[name].visible = false;
                this.labels[name].visible = false;
                if (i === MULTIPALETTES.length - 1) {
                    // last selector
                    if (this.pluginPalettes.indexOf(name) > -1) {
                        console.debug("Showing " + name);
                        this.buttons[name].visible = true;
                        this.labels[name].visible = true;
                    }
                }
            } else {
                if (name === "myblocks") {
                    var n = palettes.countProtoBlocks("myblocks");
                    if (n === 0) {
                        this.buttons[name].visible = false;
                        this.labels[name].visible = false;
                    } else {
                        this.buttons[name].visible = true;
                        this.labels[name].visible = true;
                    }
                } else {
                    this.buttons[name].visible = true;
                    this.labels[name].visible = true;
                }
            }
        }

        this.refreshCanvas();
    };

    this.setCanvas = function(canvas) {
        this.canvas = canvas;
        return this;
    };

    this.setStage = function(stage) {
        this.stage = stage;
        return this;
    };

    this.setRefreshCanvas = function(refreshCanvas) {
        this.refreshCanvas = refreshCanvas;
        return this;
    };

    this.setTrashcan = function(trashcan) {
        this.trashcan = trashcan;
        return this;
    };

    this.setSize = function(size) {
        this.cellSize = Math.floor(size * PALETTE_SCALE_FACTOR + 0.5);
        return this;
    };

    this.setMobile = function(mobile) {
        this.mobile = mobile;
        if (mobile) {
            this._hideMenus();
        }

        return this;
    };

    this.setScale = function(scale) {
        this.scale = scale;

        this._updateButtonMasks();

        for (var i in this.dict) {
            this.dict[i]._resizeEvent();
        }

        if (this.downIndicator != null) {
            this.downIndicator.y = windowHeight() / scale - 27;
        }

        return this;
    };

    // We need access to the macro dictionary because we load them.
    this.setMacroDictionary = function(obj) {
        this.macroDict = obj;
        return this;
    };

    this.setSearch = function(show, hide) {
        this.showSearchWidget = show;
        this.hideSearchWidget = hide;
        return this;
    };

    this.getSearchPos = function() {
        return [this.cellSize, this.top + this.cellSize * 1.75];
    };

    this.getPluginMacroExpansion = function(blkname, x, y) {
        console.debug(this.pluginMacros[blkname]);
        var obj = this.pluginMacros[blkname];
        if (obj != null) {
            obj[0][2] = x;
            obj[0][3] = y;
        }

        return obj;
    };

    this.countProtoBlocks = function(name) {
        // How many protoblocks are in palette name?
        var n = 0;
        for (var b in this.blocks.protoBlockDict) {
            if (
                this.blocks.protoBlockDict[b].palette !== null &&
                this.blocks.protoBlockDict[b].palette.name === name
            ) {
                n += 1;
            }
        }

        return n;
    };

    this._updateButtonMasks = function() {
        for (var name in this.buttons) {
            var s = new createjs.Shape();
            s.graphics.r(0, 0, this.cellSize, windowHeight() / this.scale);
            s.x = 0;
            s.y = this.cellSize / 2;
            this.buttons[name].mask = s;
        }
    };

    this.hidePaletteIconCircles = function() {
        // paletteText might not be defined yet.
        if (!sugarizerCompatibility.isInsideSugarizer()) {
            hidePaletteNameDisplay(this.paletteText, this.stage);
        }

        hideButtonHighlight(this.circles, this.stage);
    };

    this.getProtoNameAndPalette = function(name) {
        for (var b in this.blocks.protoBlockDict) {
            // Don't return deprecated blocks.
            if (
                name === this.blocks.protoBlockDict[b].staticLabels[0] &&
                !this.blocks.protoBlockDict[b].hidden
            ) {
                return [
                    b,
                    this.blocks.protoBlockDict[b].palette.name,
                    this.blocks.protoBlockDict[b].name
                ];
            } else if (name === b && !this.blocks.protoBlockDict[b].hidden) {
                return [
                    b,
                    this.blocks.protoBlockDict[b].palette.name,
                    this.blocks.protoBlockDict[b].name
                ];
            }
        }

        return [null, null, null];
    };

    this.makePalettes = function(hide) {
    };

    this.makePalettesNew = function(i) {
        let palette = docById("palette");
        let listBody = palette.children[0].children[1];
        listBody.parentNode.removeChild(listBody);
        listBody = palette.children[0].appendChild(document.createElement("tbody"));
        // Make an icon/button for each palette
        this.makeButton(
            "search",
            makePaletteIcons(
                PALETTEICONS["search"]
                ,this.cellSize
                ,this.cellSize
            )
            ,listBody                
        );
        for (let name of MULTIPALETTES[i] ) {
            this.makeButton(
                name,
                makePaletteIcons(
                    PALETTEICONS[name]
                    ,this.cellSize
                    ,this.cellSize
                )
                ,listBody                
            );
        }
        // for (let name in this.dict){
        //     this.dict[name].makeMenu(true);
        //     this.dict[name]._moveMenu(
        //         Math.max(3, MULTIPALETTES.length) * STANDARDBLOCKHEIGHT,
        //         this.top
        //     );
        //     this.dict[name]._updateMenu(false);
        // }

    };

    this.makeButton = function (name,icon,listBody){
        let row = listBody.insertRow(-1);
        let img = row.insertCell(-1);
        let label = row.insertCell(-1).appendChild(document.createElement("p"));
        label.setAttribute("style","width: 10px ; height: 4px");
        img.appendChild(icon);
        // Add tooltip for palette buttons
        if (localStorage.kanaPreference === "kana") {
            label.textContent = toTitleCase(_(name)) ;
            //label.setAttribute("style","font-size: 12px; color:platformColor.paletteText");
        } else {
            label.textContent = toTitleCase(_(name)) ;
            //label.setAttribute("style","font-size: 16px; color:platformColor.paletteText");
        }

        this._loadPaletteButtonHandler(name,row);
    };

    this.showPalette = function(name) {
        if (this.mobile) {
            return;
        }

        if (name == "search" && this.showSearchWidget !== null) {
            for (var i in this.dict) {
                if (this.dict[i].visible) {
                    this.dict[i].hideMenu();
                    this.dict[i]._hideMenuItems();
                }
            }

            console.debug("searching");
            this.dict[name].visible = true;
            //this.showSearchWidget(true);
            return;
        }

        this.hideSearchWidget(true);

        // for (var i in this.dict) {
        //     if (this.dict[i] !== this.dict[name]) {
        //         if (this.dict[i].visible) {
        //             this.dict[i].hideMenu();
        //             this.dict[i]._hideMenuItems();
        //         }
        //     }
        // }
        //this.dict[name]._resetLayout();
        this.dict[name].showMenu(true);
        //this.dict[name] ._showMenuItems();
    };

    this._showMenus = function() {
        // Show the menu buttons, but not the palettes.
        if (this.mobile) {
            return;
        }

        for (var i = 0; i < this.selectorButtonsOff.length; i++) {
            this.selectorButtonsOff[i].visible = true;
        }

        this.showSelection(0);

        if (this.background != null) {
            this.background.visible = true;
        }

        this.refreshCanvas();
    };

    this._hideMenus = function() {
        // Hide the menu buttons and the palettes themselves.

        for (var name in this.dict) {
            this.dict[name].hideMenu();
        }

        this.hideSearchWidget(true);

        for (var i = 0; i < this.selectorButtonsOff.length; i++) {
            this.selectorButtonsOn[i].visible = false;
            this.selectorButtonsOff[i].visible = false;
        }

        this.refreshCanvas();
    };

    this.getInfo = function() {
        for (var key in this.dict) {
            console.debug(this.dict[key].getInfo());
        }
    };

    this.updatePalettes = function(showPalette) {
        if (showPalette != null) {
            this.makePalettes(false);
            var myPalettes = this;
            setTimeout(function() {
                myPalettes.dict[showPalette]._resetLayout();
                // Show the action palette after adding/deleting new
                // nameddo blocks.
                // myPalettes.dict[showPalette].showMenu();
                // myPalettes.dict[showPalette]._showMenuItems();
                myPalettes.dict[showPalette].hideMenu();
                myPalettes.dict[showPalette]._hideMenuItems();
                myPalettes.refreshCanvas();
            }, 100);
        } else {
            this.makePalettes(true);
            this.refreshCanvas();
        }

        if (this.mobile) {
            var that = this;
            setTimeout(function() {
                that.hide();

                for (var i in that.dict) {
                    if (that.dict[i].visible) {
                        that.dict[i].hideMenu();
                        that.dict[i]._hideMenuItems();
                    }
                }
            }, 500);
        }
    };

    this.hide = function() {
    };

    this.show = function() {
    };

    this.setBlocks = function(blocks) {
        this.blocks = blocks;
        return this;
    };

    this.add = function(name) {
        this.dict[name] = new PaletteNew1(this, name);
        return this;
    };

    this.remove = function(name) {
        if (!(name in this.buttons)) {
            console.debug("Palette.remove: Cannot find palette " + name);
            return;
        }

        console.debug(this.labels[name]);
        this.labels[name].visible = false;
        this.stage.removeChild(this.labels[name]);
        this.buttons[name].visible = false;
        this.buttons[name].removeAllChildren();
        this.stage.removeChild(this.buttons[name]);
        var btnKeys = Object.keys(this.dict);
        for (
            var btnKey = btnKeys.indexOf(name) + 1;
            btnKey < btnKeys.length;
            btnKey++
        ) {
            this.buttons[btnKeys[btnKey]].y -= this.cellSize;
        }
        delete this.buttons[name];
        delete this.labels[name];
        delete this.dict[name];
        this.y -= this.cellSize;
        this.makePalettes(true);
    };

    this.bringToTop = function() {

    };

    this.findPalette = function(x, y) {
        for (var name in this.dict) {
            var px = this.dict[name].menuContainer.x;
            var py = this.dict[name].menuContainer.y;
            var height = Math.min(
                maxPaletteHeight(this.cellSize, this.scale),
                this.dict[name].y
            );
            if (
                this.dict[name].menuContainer.visible &&
                px < x &&
                x < px + MENUWIDTH * PROTOBLOCKSCALE &&
                py < y &&
                y < py + height
            ) {
                return this.dict[name];
            }
        }
        return null;
    };

    // Palette Button event handlers
    this._loadPaletteButtonHandler = function(name,row) {
        row.onmouseover = (evt) => {
            document.body.style.cursor = "pointer";
        }
        row.onclick = (evt) => {
            if (name == "search")this.showSearchWidget();
            this.showPalette(name)
        }
        row.onmouseup = (evt) => {
            document.body.style.cursor = "default";
        }
        row.onmouseleave = (evt) => {
            document.body.style.cursor = "default";
        }

    };

    this.removeActionPrototype = function(actionName) {
        var blockRemoved = false;
        for (var blk = 0; blk < this.dict["action"].protoList.length; blk++) {
            var actionBlock = this.dict["action"].protoList[blk];
            if (
                ["nameddo", "namedcalc", "nameddoArg", "namedcalcArg"].indexOf(
                    actionBlock.name
                ) !== -1 &&
                actionBlock.defaults[0] === actionName
            ) {
                // Remove the palette protoList entry for this block.
                this.dict["action"].remove(actionBlock, actionName);

                // And remove it from the protoBlock dictionary.
                if (this.blocks.protoBlockDict["myDo_" + actionName]) {
                    // console.debug('DELETING PROTOBLOCKS FOR ACTION ' + actionName);
                    delete this.blocks.protoBlockDict["myDo_" + actionName];
                } else if (this.blocks.protoBlockDict["myCalc_" + actionName]) {
                    // console.debug('deleting protoblocks for action ' + actionName);
                    delete this.blocks.protoBlockDict["myCalc_" + actionName];
                } else if (
                    this.blocks.protoBlockDict["myDoArg_" + actionName]
                ) {
                    // console.debug('deleting protoblocks for action ' + actionName);
                    delete this.blocks.protoBlockDict["myDoArg_" + actionName];
                } else if (
                    this.blocks.protoBlockDict["myCalcArg_" + actionName]
                ) {
                    // console.debug('deleting protoblocks for action ' + actionName);
                    delete this.blocks.protoBlockDict[
                        "myCalcArg_" + actionName
                    ];
                }
                blockRemoved = true;
                break;
            }
        }

        // Force an update if a block was removed.
        if (blockRemoved) {
            // this.hide();
            this.updatePalettes("action");
            // if (this.mobile) {
            //     this.hide();
            // } else {
            //     this.show();
            // }
        }
    };

    return this;
}

// Kind of a model, but it only keeps a list of SVGs
function PaletteModel(palette, palettes, name) {
    this.palette = palette;
    this.palettes = palettes;
    this.name = name;
    this.blocks = [];

    this.update = function() {
        this.blocks = [];
        for (var blk in this.palette.protoList) {
            var block = this.palette.protoList[blk];
            // Don't show hidden blocks on the menus
            // But we still make them.
            // if (block.hidden) {
            //     continue;
            // }

            // Create a proto block for each palette entry.
            var blkname = block.name;
            var modname = blkname;

            switch (blkname) {
                // Use the name of the action in the label
                case "storein":
                    modname = "store in " + block.defaults[0];
                    var arg = block.defaults[0];
                    break;
                case "storein2":
                    modname = "store in2 " + block.staticLabels[0];
                    var arg = block.staticLabels[0];
                    break;
                case "box":
                    modname = block.defaults[0];
                    var arg = block.defaults[0];
                    break;
                case "namedbox":
                    if (block.defaults[0] === undefined) {
                        modname = "namedbox";
                        var arg = _("box");
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
                case "namedarg":
                    if (block.defaults[0] === undefined) {
                        modname = "namedarg";
                        var arg = "1";
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
                case "nameddo":
                    if (block.defaults[0] === undefined) {
                        modname = "nameddo";
                        var arg = _("action");
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
                case "nameddoArg":
                    if (block.defaults[0] === undefined) {
                        modname = "nameddoArg";
                        var arg = _("action");
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
                case "namedcalc":
                    if (block.defaults[0] === undefined) {
                        modname = "namedcalc";
                        var arg = _("action");
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
                case "namedcalcArg":
                    if (block.defaults[0] === undefined) {
                        modname = "namedcalcArg";
                        var arg = _("action");
                    } else {
                        modname = block.defaults[0];
                        var arg = block.defaults[0];
                    }
                    break;
            }

            var protoBlock = this.palettes.blocks.protoBlockDict[blkname];
            if (protoBlock === null) {
                console.debug("Could not find block " + blkname);
                continue;
            }

            var label = "";
            // console.debug(protoBlock.name);
            switch (protoBlock.name) {
                case "text":
                    label = _("text");
                    break;
                case "drumname":
                    label = _("drum");
                    break;
                case "effectsname":
                    label = _("effect");
                    break;
                case "solfege":
                    label = i18nSolfege("sol");
                    break;
                case "eastindiansolfege":
                    label = "sargam";
                    break;
                case "scaledegree2":
                    label = "scale degree";
                    break;
                case "modename":
                    label = _("mode name");
                    break;
                case "invertmode":
                    label = _("invert mode");
                    break;
                case "voicename":
                    label = _("voice name");
                    break;
                case "temperamentname":
                    //TRANS: https://en.wikipedia.org/wiki/Musical_temperament
                    label = _("temperament");
                    break;
                case "accidentalname":
                    //TRANS: accidental refers to sharps, flats, etc.
                    label = _("accidental");
                    break;
                case "notename":
                    label = "G";
                    break;
                case "intervalname":
                    label = _("interval name");
                    break;
                case "boolean":
                    label = _("true");
                    break;
                case "number":
                    label = NUMBERBLOCKDEFAULT.toString();
                    break;
                case "less":
                case "greater":
                case "equal":
                    // Label should be inside _() when defined.
                    label = protoBlock.staticLabels[0];
                    break;
                case "namedarg":
                    label = "arg " + arg;
                    break;
                case "outputtools":
                    label = "current pitch  ";
                    break;
                default:
                    if (blkname != modname) {
                        // Override label for do, storein, box, and namedarg
                        if (
                            blkname === "storein" &&
                            block.defaults[0] === _("box")
                        ) {
                            label = _("store in");
                        } else if (blkname === "storein2") {
                            if (block.staticLabels[0] === _("store in box")) {
                                label = _("store in box");
                            } else {
                                label =
                                    _("store in") + " " + block.staticLabels[0];
                            }
                        } else {
                            label = block.defaults[0];
                        }
                    } else if (protoBlock.staticLabels.length > 0) {
                        label = protoBlock.staticLabels[0];
                        if (label === "") {
                            if (blkname === "loadFile") {
                                label = _("open file");
                            } else {
                                label = blkname;
                            }
                        }
                    } else {
                        label = blkname;
                    }
            }

            if (
                [
                    "do",
                    "nameddo",
                    "namedbox",
                    "namedcalc",
                    "doArg",
                    "calcArg",
                    "nameddoArg",
                    "namedcalcArg"
                ].indexOf(protoBlock.name) != -1 &&
                label != null
            ) {
                if (getTextWidth(label, "bold 20pt Sans") > TEXTWIDTH) {
                    label = label.substr(0, STRINGLEN) + "...";
                }
            }

            // Don't display the label on image blocks.
            if (protoBlock.image) {
                label = "";
            }

            var saveScale = protoBlock.scale;
            protoBlock.scale = DEFAULTBLOCKSCALE;

            // Finally, the SVGs!
            switch (protoBlock.name) {
                case "namedbox":
                case "namedarg":
                    // so the label will fit
                    var svg = new SVG();
                    svg.init();
                    svg.setScale(protoBlock.scale);
                    svg.setExpand(60, 0, 0, 0);
                    svg.setOutie(true);
                    var artwork = svg.basicBox();
                    var docks = svg.docks;
                    var height = svg.getHeight();
                    break;
                case "nameddo":
                    // so the label will fit
                    var svg = new SVG();
                    svg.init();
                    svg.setScale(protoBlock.scale);
                    svg.setExpand(60, 0, 0, 0);
                    var artwork = svg.basicBlock();
                    var docks = svg.docks;
                    var height = svg.getHeight();
                    break;
                default:
                    var obj = protoBlock.generator();
                    var artwork = obj[0];
                    var docks = obj[1];
                    var height = obj[3];
                    break;
            }

            protoBlock.scale = saveScale;

            if (protoBlock.disabled) {
                artwork = artwork
                    .replace(/fill_color/g, DISABLEDFILLCOLOR)
                    .replace(/stroke_color/g, DISABLEDSTROKECOLOR)
                    .replace("block_label", safeSVG(label));
            } else {
                artwork = artwork
                    .replace(
                        /fill_color/g,
                        PALETTEFILLCOLORS[protoBlock.palette.name]
                    )
                    .replace(
                        /stroke_color/g,
                        PALETTESTROKECOLORS[protoBlock.palette.name]
                    )
                    .replace("block_label", safeSVG(label));
            }

            for (var i = 0; i <= protoBlock.args; i++) {
                artwork = artwork.replace(
                    "arg_label_" + i,
                    protoBlock.staticLabels[i] || ""
                );
            }

            this.blocks.push({
                blk,
                blkname,
                modname,
                height: STANDARDBLOCKHEIGHT,
                actualHeight: height,
                label,
                artwork,
                artwork64:
                    "data:image/svg+xml;base64," +
                    window.btoa(unescape(encodeURIComponent(artwork))),
                docks,
                image: block.image,
                scale: block.scale,
                palettename: this.palette.name,
                hidden: block.hidden
            });
        }
    };
}

// Define objects for individual palettes.
function PaletteNew1(palettes, name) {
    this.palettes = palettes;
    this.name = name;
    this.model = new PaletteModel(this, palettes, name);
    this.visible = false;
    this.menuContainer = null;
    this.protoList = [];
    this.protoContainers = {};
    this.protoHeights = {};
    this.background = null;
    this.size = 0;
    this.columns = 0;
    this.draggingProtoBlock = false;
    this.mouseHandled = false;
    this.upButton = null;
    this.downButton = null;
    this.fadedUpButton = null;
    this.fadedDownButton = null;
    this.count = 0;

    this.makeMenu = function(createHeader) {

    };

    this._resizeEvent = function() {
        this.hide();
        this._updateBackground();
        this._updateBlockMasks();
    };

    this._updateBlockMasks = function() {
    };

    this._getOverflowWidth = function() {
        var maxWidth = 0;
        for (var i in this.protoList) {
            if (this.protoList[i].hidden) {
                continue;
            }

            maxWidth = Math.max(maxWidth, this.protoList[i].textWidth);
        }

        return maxWidth > 100 ? (maxWidth - 30) * PROTOBLOCKSCALE : 0;
    };

    this._updateBackground = function() {
        if (this.menuContainer === null) {
            return;
        }

        if (this.background !== null) {
            this.background.removeAllChildren();
        } else {
            this.background = new createjs.Container();
            this.background.snapToPixelEnabled = true;
            this.background.visible = false;
            this.palettes.stage.addChild(this.background);
            this._setupBackgroundEvents();
        }

        // Since we don't always add items at the end, the dependency
        // on this.y is unrelable. Easy workaround is just to always
        // extend the palette to the bottom.

        // var h = Math.min(maxPaletteHeight(this.palettes.cellSize, this.palettes.scale), this.y);
        var h = maxPaletteHeight(this.palettes.cellSize, this.palettes.scale);

        var shape = new createjs.Shape();
        shape.graphics
            .f(platformColor.ruleColor)
            .r(0, 0, MENUWIDTH * PROTOBLOCKSCALE + this._getOverflowWidth(), h)
            .ef()
            .f(platformColor.paletteBackground)
            .r(
                2,
                2,
                MENUWIDTH * PROTOBLOCKSCALE + this._getOverflowWidth() - 4,
                h - 4
            )
            .ef();
        shape.width = MENUWIDTH * PROTOBLOCKSCALE + this._getOverflowWidth();
        shape.height = h;
        this.background.addChild(shape);

        this.background.x = this.menuContainer.x;
        this.background.y = this.menuContainer.y + STANDARDBLOCKHEIGHT / 2;
    };

    this._resetLayout = function() {
    }

    this._moveMenu = function(x, y) {
    };

    this._moveMenuRelative = function(dx, dy) {
    };

    this.hide = function() {
        this.hideMenu();
    };

    this.show = function() {
        if (this.palettes.mobile) {
            this.hideMenu();
        } else {
            this.showMenu();
        }

        for (var i in this.protoContainers) {
            this.protoContainers[i].visible = true;
        }
        this._updateBlockMasks();
        if (this.background !== null) {
            this.background.visible = true;
        }
    };

    this.hideMenu = function() {
        if (this.name === "search" && this.palettes.hideSearchWidget !== null) {
            this.palettes.hideSearchWidget(true);
        }

        this._hideMenuItems();
    };

    this.showMenu = function(createHeader) {
        
        let palDiv = docById("palette");
        if (palDiv.children.length > 1) 
            palDiv.removeChild(palDiv.children[1]);
        let x = document.createElement("table");
        x.setAttribute("border","0px");
        x.setAttribute("bgcolor","white");
        x.setAttribute("style","float: left");
        x.innerHTML= '<thead></thead><tbody style = "display: block; height: 400px; overflow: auto;" id ="PaletteBody_items" class="PalScrol"></tbody>'
        palDiv.appendChild(x)
        this.menuContainer=x ;

        if (createHeader) {
            var paletteWidth =
                MENUWIDTH * PROTOBLOCKSCALE + this._getOverflowWidth();
                
            let header = this.menuContainer.children[0];
            header = header.insertRow();
            header.innerHTML='<td style ="width: 10px"></td><td></td><td></td>';
            let closeImg = makePaletteIcons(
                CLOSEICON.replace("fill_color", platformColor.selectorSelected),
                this.palettes.cellSize,
                this.palettes.cellSize,
            );
            closeImg.onclick = () => {
                palDiv.removeChild(x);
            }
            let labelImg = makePaletteIcons(
                PALETTEICONS[name],
                this.palettes.cellSize,
                this.palettes.cellSize,
            );
            header.children[0].appendChild(labelImg);
            header.children[1].textContent = toTitleCase(_(this.name));
            header.children[2].appendChild(closeImg);
        }
        this._showMenuItems();
    };

    this._hideMenuItems = function() {
        if (this.name === "search" && this.palettes.hideSearchWidget !== null) {
            this.palettes.hideSearchWidget(true);
        }

        for (var i in this.protoContainers) {
            this.protoContainers[i].visible = false;
        }

        //docById("palette").removeChild(docById("palette").children[1]);        
    };

    this._showMenuItems = function() {

        this.model.update();
        let paletteList = docById("PaletteBody_items");

        let blocks = this.model.blocks;
        blocks.reverse();
        for (let blk in blocks) {
            let b = blocks[blk];

            if (b.hidden) {
                continue;
            }
            let itemRow = paletteList.insertRow();
            let itemCell = itemRow.insertCell();
            var that = this ;
            if (!this.protoContainers[b.modname]){
                let img = makePaletteIcons(
                    b.artwork
                );
                img.onmouseover = (evt) => {
                    document.body.style.cursor = "pointer";
                }
                img.onmouseleave = (evt) => {
                    document.body.style.cursor = "default";
                }
        
                img.ondragstart = function() {
                    return false;
                };
                img.onmousedown = function(event){
                    // (1) prepare to moving: make absolute and on top by z-index
                    let posit = img.style.position ; 
                    let zInd = img.style.zIndex ; 
                    img.style.position = 'absolute';
                    img.style.zIndex = 1000;

                    // move it out of any current parents directly into body
                    // to make it positioned relative to the body
                    document.body.appendChild(img);
                  
                    // centers the img at (pageX, pageY) coordinates
                    moveAt = (pageX, pageY) => {
                      img.style.left = pageX - img.offsetWidth / 2 + 'px';
                      img.style.top = pageY - img.offsetHeight / 2 + 'px';
                    }
                  
                    // move our absolutely positioned img under the pointer
                    moveAt(event.pageX, event.pageY);
                  
                    let onMouseMove = (event) => {
                      moveAt(event.pageX, event.pageY);
                    }
                  
                    // (2) move the img on mousemove
                    document.addEventListener('mousemove', onMouseMove);
                  
                    // (3) drop the img, remove unneeded handlers
                    img.onmouseup = function (event) {
                        document.body.style.cursor = "default";
                        docById("palette").removeChild(docById("palette").children[1]);
                        document.removeEventListener('mousemove', onMouseMove);
                        img.onmouseup = null;
                        console.log(that.protoList[blk],blk);
                        that._makeBlockFromProtoblock(
                            that.protoList[blk],
                            true,
                            b.modname,
                            event,
                            event.pageX - img.offsetWidth / 2,
                            event.pageY - img.offsetHeight/ 2,
                        );
                        img.style.position = posit;
                        img.style.zIndex = zInd;
                        document.body.removeChild(img);
                        itemCell.appendChild(img)
                    };
                  
                };
                itemCell.setAttribute("style","width: "+img.width+"px ");
                itemCell.appendChild(
                    img
                )
            }
        }

        if (this.palettes.mobile) {
            this.hide();
        }

    };

    this.getInfo = function() {
        var returnString = this.name + " palette:";
        for (var thisBlock in this.protoList) {
            returnString += " " + this.protoList[thisBlock].name;
        }
        return returnString;
    };

    this.remove = function(protoblock, name) {
        // Remove the protoblock and its associated artwork container.
        var i = this.protoList.indexOf(protoblock);
        if (i !== -1) {
            this.protoList.splice(i, 1);
        }

        for (var i = 0; i < this.model.blocks.length; i++) {
            if (
                ["nameddo", "nameddoArg", "namedcalc", "namedcalcArg"].indexOf(
                    this.model.blocks[i].blkname
                ) !== -1 &&
                this.model.blocks[i].modname === name
            ) {
                this.model.blocks.splice(i, 1);
                break;
            } else if (
                ["storein"].indexOf(this.model.blocks[i].blkname) !== -1 &&
                this.model.blocks[i].modname === _("store in") + " " + name
            ) {
                this.model.blocks.splice(i, 1);
                break;
            }
        }

        let list = docById("PaletteBody_items");
        for (let i of list.children) {
        }
        delete this.protoContainers[name];
    };

    this.add = function(protoblock, top) {
        // Add a new palette entry to the end of the list (default) or
        // to the top.
        if (this.protoList.indexOf(protoblock) === -1) {
            if (top === undefined) {
                this.protoList.push(protoblock);
            } else {
                this.protoList.splice(0, 0, protoblock);
            }
        }
        return this;
    };

    this._setupBackgroundEvents = function() {
        var that = this;
        var scrolling = false;

        // Ensure we don't end up with duplicate event handlers.
        this.background.removeAllEventListeners("mouseover");
        this.background.removeAllEventListeners("mouseout");
        this.background.removeAllEventListeners("mousedown");

        this.background.on("mouseover", function(event) {
            that.palettes.activePalette = that;
        });

        this.background.on("mouseout", function(event) {
            that.palettes.activePalette = null;
        });

        this.background.on("mousedown", function(event) {
            scrolling = true;
            var lastY = event.stageY;

            that.background.removeAllEventListeners("pressmove");
            that.background.on("pressmove", function(event) {
                if (!scrolling) {
                    return;
                }

                var diff = event.stageY - lastY;
                that.scrollEvent(diff, 10);
                lastY = event.stageY;
            });

            that.background.removeAllEventListeners("pressup");
            that.background.on(
                "pressup",
                function(event) {
                    that.palettes.activePalette = null;
                    scrolling = false;
                },
                null,
                true
            ); // once = true
        });
    };

    // Palette Menu event handlers
    this._loadPaletteMenuHandler = function() {
        // The palette menu is the container for the protoblocks. One
        // palette per palette button.

        var that = this;
        var locked = false;
        var trashcan = this.palettes.trashcan;
        var paletteWidth =
            MENUWIDTH * PROTOBLOCKSCALE + this._getOverflowWidth();

        this.menuContainer.on("click", function(event) {
            if (
                Math.round(event.stageX / that.palettes.scale) >
                that.menuContainer.x + paletteWidth - STANDARDBLOCKHEIGHT
            ) {
                that.hide();
                that.palettes.refreshCanvas();
                return;
            }

            if (locked) {
                return;
            }

            locked = true;
            setTimeout(function() {
                locked = false;
            }, 500);

            for (var p in that.palettes.dict) {
                if (that.name != p) {
                    if (that.palettes.dict[p].visible) {
                        that.palettes.dict[p]._hideMenuItems();
                    }
                }
            }

            if (that.visible) {
                that._hideMenuItems();
            } else {
                that._showMenuItems();
            }
            that.palettes.refreshCanvas();
        });

        this.menuContainer.on("mouseover", function(event) {
            document.body.style.cursor = "pointer";
        });

        this.menuContainer.on("mouseout", function(event) {
            document.body.style.cursor = "default";
        });
    };

    // Menu Item event handlers
    this._loadPaletteMenuItemHandler = function(protoblk, blkname) {
        // A menu item is a protoblock that is used to create a new block.
        var that = this;
        var pressupLock = false;
        var pressed = false;
        var moved = false;
        var saveX = this.protoContainers[blkname].x;
        var saveY = this.protoContainers[blkname].y;
        var bgScrolling = false;

        this.protoContainers[blkname].on("mouseover", function(event) {
            document.body.style.cursor = "pointer";
            that.palettes.activePalette = that;
        });

        this.protoContainers[blkname].on("mousedown", function(event) {
            var stage = that.palettes.stage;
            stage.setChildIndex(
                that.protoContainers[blkname],
                stage.children.length - 1
            );

            var h = Math.min(
                maxPaletteHeight(that.palettes.cellSize, that.palettes.scale),
                that.palettes.y
            );
            var clickY = event.stageY / that.palettes.scale;
            var paletteEndY = that.menuContainer.y + h + STANDARDBLOCKHEIGHT;

            // if(clickY < paletteEndY)
            that.protoContainers[blkname].mask = null;

            moved = false;
            pressed = true;
            saveX = that.protoContainers[blkname].x;
            saveY = that.protoContainers[blkname].y - that.scrollDiff;
            var startX = event.stageX;
            var startY = event.stageY;
            var lastY = event.stageY;

            if (that.draggingProtoBlock) {
                return;
            }

            var mode = window.hasMouse ? MODEDRAG : MODEUNSURE;

            that.protoContainers[blkname].removeAllEventListeners("pressmove");
            that.protoContainers[blkname].on("pressmove", function(event) {
                if (mode === MODEDRAG) {
                    // if(clickY < paletteEndY)
                    moved = true;
                    that.draggingProtoBlock = true;
                    that.protoContainers[blkname].x =
                        Math.round(event.stageX / that.palettes.scale) -
                        PALETTELEFTMARGIN;
                    that.protoContainers[blkname].y = Math.round(
                        event.stageY / that.palettes.scale
                    );
                    that.palettes.refreshCanvas();
                    return;
                }

                if (mode === MODESCROLL) {
                    var diff = event.stageY - lastY;
                    that.scrollEvent(diff, 10);
                    lastY = event.stageY;
                    return;
                }

                var xd = Math.abs(event.stageX - startX);
                var yd = Math.abs(event.stageY - startY);
                var diff = Math.sqrt(xd * xd + yd * yd);
                if (mode === MODEUNSURE && diff > DECIDEDISTANCE) {
                    mode = yd > xd ? MODESCROLL : MODEDRAG;
                }
            });
        });

        this.protoContainers[blkname].on("mouseout", function(event) {
            // Catch case when pressup event is missed.
            // Put the protoblock back on the palette...
            document.body.style.cursor = "default";
            that.palettes.activePalette = null;

            if (pressed && moved) {
                that._restoreProtoblock(
                    blkname,
                    saveX,
                    saveY + that.scrollDiff
                );
                pressed = false;
                moved = false;
            }
        });

        this.protoContainers[blkname].on("pressup", function(event) {
            document.body.style.cursor = "default";
            that.palettes.activePalette = null;

            if (pressupLock) {
                return;
            } else {
                pressupLock = true;
                setTimeout(function() {
                    pressupLock = false;
                }, 1000);
            }

            that._makeBlockFromProtoblock(
                protoblk,
                moved,
                blkname,
                event,
                saveX,
                saveY
            );
        });
    };

    this._restoreProtoblock = function(name, x, y) {
        // Return protoblock we've been dragging back to the palette.
        this.protoContainers[name].x = x;
        this.protoContainers[name].y = y;
        // console.debug('restore ' + name);
        this._resetLayout();
    };

    this.makeBlockFromSearch = function(protoblk, blkname, callback) {
        this._makeBlockFromPalette(protoblk, blkname, callback);
    };

    this._makeBlockFromPalette = function(protoblk, blkname, callback) {
        if (protoblk === null) {
            console.debug("null protoblk?");
            return;
        }

        switch (protoblk.name) {
            case "do":
                blkname = "do " + protoblk.defaults[0];
                var newBlk = protoblk.name;
                var arg = protoblk.defaults[0];
                break;
            case "storein":
                // Use the name of the box in the label
                blkname = "store in " + protoblk.defaults[0];
                var newBlk = protoblk.name;
                var arg = protoblk.defaults[0];
                break;
            case "storein2":
                // Use the name of the box in the label
                console.debug(
                    "storein2" +
                        " " +
                        protoblk.defaults[0] +
                        " " +
                        protoblk.staticLabels[0]
                );
                blkname = "store in2 " + protoblk.defaults[0];
                var newBlk = protoblk.name;
                var arg = protoblk.staticLabels[0];
                break;
            case "box":
                // Use the name of the box in the label
                blkname = protoblk.defaults[0];
                var newBlk = protoblk.name;
                var arg = protoblk.defaults[0];
                break;
            case "namedbox":
                // Use the name of the box in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "namedbox";
                    var arg = _("box");
                } else {
                    console.debug(protoblk.defaults[0]);
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "namedarg":
                // Use the name of the arg in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "namedarg";
                    var arg = "1";
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "nameddo":
                // Use the name of the action in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "nameddo";
                    var arg = _("action");
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "nameddoArg":
                // Use the name of the action in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "nameddoArg";
                    var arg = _("action");
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "namedcalc":
                // Use the name of the action in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "namedcalc";
                    var arg = _("action");
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "namedcalcArg":
                // Use the name of the action in the label
                if (protoblk.defaults[0] === undefined) {
                    blkname = "namedcalcArg";
                    var arg = _("action");
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            case "outputtools":
                if (protoblk.defaults[0] === undefined) {
                    blkname = "outputtools";
                    var arg = "letter class";
                } else {
                    blkname = protoblk.defaults[0];
                    var arg = protoblk.defaults[0];
                }
                var newBlk = protoblk.name;
                break;
            default:
                if (blkname === "nameddo") {
                    var arg = _("action");
                } else {
                    var arg = "__NOARG__";
                }

                var newBlk = blkname;
                break;
        }

        var lastBlock = this.palettes.blocks.blockList.length;

        if (
            [
                "namedbox",
                "nameddo",
                "namedcalc",
                "nameddoArg",
                "namedcalcArg"
            ].indexOf(protoblk.name) === -1 &&
            blockIsMacro(blkname)
        ) {
            var moved = true;
            var saveX = this.protoContainers[blkname].x;
            var saveY = this.protoContainers[blkname].y;
            this._makeBlockFromProtoblock(
                protoblk,
                moved,
                blkname,
                null,
                saveX,
                saveY
            );
            callback(lastBlock);
        } else if (
            [
                "namedbox",
                "nameddo",
                "namedcalc",
                "nameddoArg",
                "namedcalcArg"
            ].indexOf(protoblk.name) === -1 &&
            blkname in this.palettes.pluginMacros
        ) {
            var moved = true;
            var saveX = this.protoContainers[blkname].x;
            var saveY = this.protoContainers[blkname].y;
            this._makeBlockFromProtoblock(
                protoblk,
                moved,
                blkname,
                null,
                saveX,
                saveY
            );
            callback(lastBlock);
        } else {
            var newBlock = paletteBlockButtonPush(
                this.palettes.blocks,
                newBlk,
                arg
            );
            callback(newBlock);
        }
    };

    this.cleanup = function() {
        this._resetLayout();
        this._updateBlockMasks();
    };

    this._makeBlockFromProtoblock = function(
        protoblk,
        moved,
        blkname,
        event,
        saveX,
        saveY
    ) {
        var that = this;

        function __myCallback(newBlock) {
            // Move the drag group under the cursor.
            that.palettes.blocks.findDragGroup(newBlock);
            for (var i in that.palettes.blocks.dragGroup) {
                that.palettes.blocks.moveBlockRelative(
                    that.palettes.blocks.dragGroup[i],
                    saveX,
                    saveY
                );
            }
            // Dock with other blocks if needed
            that.palettes.blocks.blockMoved(newBlock);
            that.palettes.blocks.checkBounds();
        }

        if (moved) {
            moved = false;
            this.draggingProtoBlock = false;

            var macroExpansion = null;
            if (
                [
                    "namedbox",
                    "nameddo",
                    "namedcalc",
                    "nameddoArg",
                    "namedcalcArg"
                ].indexOf(protoblk.name) === -1
            ) {
                var macroExpansion = getMacroExpansion(
                    blkname,
                    saveX,
                    saveY
                );
                if (macroExpansion === null) {
                    // Maybe it is a plugin macro?
                    if (blkname in this.palettes.pluginMacros) {
                        var macroExpansion = this.palettes.getPluginMacroExpansion(
                            blkname,
                            saveX,
                            saveY
                        );
                    }
                }
            }

            if (macroExpansion != null) {
                this.palettes.blocks.loadNewBlocks(macroExpansion);
                var thisBlock = this.palettes.blocks.blockList.length - 1;
                var topBlk = this.palettes.blocks.findTopBlock(thisBlock);
            } else if (this.name === "myblocks") {
                // If we are on the myblocks palette, it is a macro.
                var macroName = blkname.replace("macro_", "");

                // We need to copy the macro data so it is not overwritten.
                var obj = [];
                for (
                    var b = 0;
                    b < this.palettes.macroDict[macroName].length;
                    b++
                ) {
                    var valueEntry = this.palettes.macroDict[macroName][b][1];
                    var newValue = [];
                    if (typeof valueEntry === "string") {
                        newValue = valueEntry;
                    } else if (typeof valueEntry[1] === "string") {
                        if (valueEntry[0] === "number") {
                            newValue = [valueEntry[0], Number(valueEntry[1])];
                        } else {
                            newValue = [valueEntry[0], valueEntry[1]];
                        }
                    } else if (typeof valueEntry[1] === "number") {
                        if (valueEntry[0] === "number") {
                            newValue = [valueEntry[0], valueEntry[1]];
                        } else {
                            newValue = [
                                valueEntry[0],
                                valueEntry[1].toString()
                            ];
                        }
                    } else {
                        if (valueEntry[0] === "number") {
                            newValue = [
                                valueEntry[0],
                                Number(valueEntry[1]["value"])
                            ];
                        } else {
                            newValue = [
                                valueEntry[0],
                                { value: valueEntry[1]["value"] }
                            ];
                        }
                    }

                    var newBlock = [
                        this.palettes.macroDict[macroName][b][0],
                        newValue,
                        this.palettes.macroDict[macroName][b][2],
                        this.palettes.macroDict[macroName][b][3],
                        this.palettes.macroDict[macroName][b][4]
                    ];
                    obj.push(newBlock);
                }

                // Set the position of the top block in the stack
                // before loading.
                obj[0][2] = saveX
                obj[0][3] = saveY
                this.palettes.blocks.loadNewBlocks(obj);

                // Ensure collapse state of new stack is set properly.
                var thisBlock = this.palettes.blocks.blockList.length - 1;
                var topBlk = this.palettes.blocks.findTopBlock(thisBlock);
                setTimeout(function() {
                    this.palettes.blocks.blockList[topBlk].collapseToggle();
                }, 500);
            } else {
                var newBlock = this._makeBlockFromPalette(
                    protoblk,
                    blkname,
                    __myCallback,
                    newBlock
                );
            }

            // Put the protoblock back on the palette...
            this.cleanup();
        }
    };

    return this;
}

async function initPalettes(palettes) {
    // function initPalettes (palettes) {
    // Instantiate the palettes object on first load.

    for (var i = 0; i < BUILTINPALETTES.length; i++) {
        palettes.add(BUILTINPALETTES[i]);
    }

    palettes.init_selectors();
    palettes.makePalettesNew(0);
    await delayExecution(3000);
    console.debug("Time to show the palettes.");
    palettes.show();
    palettes.showSelection(0);

    // }, 3000);
}

const MODEUNSURE = 0;
const MODEDRAG = 1;
const MODESCROLL = 2;
const DECIDEDISTANCE = 20;

function makePaletteBitmap(palette, data, name, callback, extras) {
}

function makePaletteIcons(data,width,height)  {
    let img = new Image();
    img.src =
    "data:image/svg+xml;base64," +
    window.btoa(unescape(encodeURIComponent(data)));
    if (width)img.width=width;
    if (height)img.height=height;
    return img 
}