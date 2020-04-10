// Modules to control application life and create native browser window
const { app, screen, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fontList = require('font-list');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');
const sharp = require('sharp');
const TextToSVG = require('text-to-svg');

const myApp = {
    imgPath: 'assets/img/temp.jpg',
    excelPath: '',
    resultPath: '/Users/liuguilian/Desktop/result',
    fontPath: 'assets/font/苹方黑体-准-简.ttf',
    data: [],
};

function createWindow() {
    // Create the browser window.
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
    fontList
        .getFonts()
        .then((fonts) => {
            event.reply('font-list', fonts);
        })
        .catch((err) => {
            console.log(err);
        });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('open-img-dialog', (event) => {
    dialog
        .showOpenDialog({
            properties: ['openFile'],
        })
        .then((result) => {
            if (!result.canceled) {
                console.log(result);
                myApp.imgPath = result.filePaths[0];
                event.sender.send('selected-img', result.filePaths[0]);
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

ipcMain.on('open-excel-dialog', (event) => {
    dialog
        .showOpenDialog({
            properties: ['openFile'],
        })
        .then((result) => {
            if (!result.canceled) {
                myApp.excelPath = result.filePaths[0];
                myApp.data = xlsx.parse(fs.readFileSync(myApp.excelPath))[0].data;
                event.sender.send('selected-excel', {
                    path: myApp.excelPath,
                    header: myApp.data.shift(),
                });
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

ipcMain.on('open-result-dialog', (event) => {
    dialog
        .showOpenDialog({
            properties: ['openDirectory'],
        })
        .then((result) => {
            if (!result.canceled) {
                myApp.resultPath = result.filePaths[0] + '/result';
                event.sender.send('selected-result', myApp.resultPath);
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

ipcMain.on('open-font-dialog', (event) => {
    dialog
        .showOpenDialog({
            properties: ['openFile'],
        })
        .then((result) => {
            if (!result.canceled) {
                myApp.fontPath = result.filePaths[0];
                event.sender.send('selected-font', result.filePaths[0]);
            }
        })
        .catch((err) => {
            console.log(err);
        });
});

const mkDir = (currentDir, _callback) => {
    const exists = fs.existsSync(currentDir);
    if (!exists) {
        fs.mkdirSync(currentDir);
    }
};

const removeDir = (dir) => {
    const exists = fs.existsSync(dir);
    if (!exists) {
        return false;
    }
    let files = fs.readdirSync(dir);
    for (var i = 0; i < files.length; i++) {
        let newPath = path.join(dir, files[i]);
        let stat = fs.statSync(newPath);
        if (stat.isDirectory()) {
            //如果是文件夹就递归下去
            removeDir(newPath);
        } else {
            //删除文件
            fs.unlinkSync(newPath);
        }
    }
    fs.rmdirSync(dir); //如果文件夹是空的，就将自己删除掉
};

const getWordSvg = (textToSVG, word, size = 100, color = '#fff') => {
    const attributes = {
        fill: color,
    };
    const svgOptions = {
        x: 0,
        y: 0,
        lineHeight: 1,
        fontSize: size,
        kerning: true,
        anchor: 'top',
        attributes: attributes,
    };
    const svg = textToSVG.getSVG(word, svgOptions);
    const width = Number(svg.match(/width="(.*?)"/)[1]);
    const svgPath = Buffer.from(svg);
    return {
        width: width,
        svgPath: svgPath,
    };
};

const finishCreated = (event) => {
    shell.showItemInFolder(myApp.resultPath + '/');
    event.sender.send('finish-created', myApp.resultPath + '/');
};

ipcMain.on('create-img', (event, params) => {
    removeDir(myApp.resultPath);
    mkDir(myApp.resultPath);
    const textToSVG = TextToSVG.loadSync(myApp.fontPath);
    let mask = 0;

    myApp.data.forEach((item, index) => {
        const fileName = item[0].replace(/(^\s*)|(\s*$)/g, '');
        const composite = params.tr
            .map((st, j) => {
                const name = item[j].replace(/(^\s*)|(\s*$)/g, '');
                const options = getWordSvg(textToSVG, name, st.font, st.color);
                if (st.selected) {
                    return {
                        input: options.svgPath,
                        blend: 'over',
                        top: st.y,
                        left: st.align === 'center' ? Math.round(st.x - options.width / 2) : st.align === 'right' ? Math.round(st.x - options.width) : st.x,
                    };
                } else {
                    return {};
                }
            })
            .filter((st) => {
                return !!st.blend;
            });
        sharp(myApp.imgPath)
            .composite(composite)
            .toFile(`${myApp.resultPath}/${fileName}.jpg`, (err, info) => {
                mask++;
                if (mask === myApp.data.length) {
                    finishCreated(event);
                }
                if (err) {
                    console.log('生成卡片失败', err);
                } else {
                    // console.log(`${index + '_' + fileName}.jpg done!`);
                }
            });
    });
});

ipcMain.on('get-sys-fonts', (event) => {
    fontList
        .getFonts()
        .then((fonts) => {
            event.reply('font-list', fonts);
        })
        .catch((err) => {
            console.log(err);
        });
});
