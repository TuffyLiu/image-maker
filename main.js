// Modules to control application life and create native browser window
const { app, screen, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const xlsx = require('node-xlsx');
const sharp = require('sharp');
const TextToSVG = require('text-to-svg');
const download = require('download');

const myApp = {
    imgPath: '',
    tempPath: '',
    excelPath: '',
    resultPath: '',
    fontPath: `${__dirname}/assets/font/苹方黑体-准-简.ttf`,
    data: []
};

function createWindow() {
    // Create the browser window.
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const mainWindow = new BrowserWindow({
        width,
        height,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile('index.html');

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
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
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg'] }]
        })
        .then((result) => {
            if (!result.canceled) {
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
            filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
        })
        .then((result) => {
            if (!result.canceled) {
                myApp.excelPath = result.filePaths[0];
                myApp.data = xlsx.parse(fs.readFileSync(myApp.excelPath))[0].data;
                myApp.data = myApp.data.filter((item) => {
                    return !!item[0];
                });
                event.sender.send('selected-excel', {
                    path: myApp.excelPath,
                    header: myApp.data.shift()
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
            properties: ['openDirectory']
        })
        .then((result) => {
            if (!result.canceled) {
                myApp.resultPath = result.filePaths[0] + '/result';
                myApp.tempPath = result.filePaths[0] + '/result/bin';
                event.sender.send('selected-result', result.filePaths[0]);
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
            filters: [{ name: 'Font', extensions: ['ttf', 'otf', 'ttc'] }]
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
        fill: color
    };
    const svgOptions = {
        x: 0,
        y: 0,
        lineHeight: 1,
        fontSize: size,
        kerning: true,
        anchor: 'top',
        attributes: attributes
    };
    const svg = textToSVG.getSVG(word, svgOptions);
    const width = Number(svg.match(/width="(.*?)"/)[1]);
    const height = Number(svg.match(/height="(.*?)"/)[1]);
    const svgPath = Buffer.from(svg);
    return {
        width: width,
        height: height,
        svgPath: svgPath
    };
};

const finishCreated = (event) => {
    shell.showItemInFolder(myApp.resultPath + '/');
    event.sender.send('finish-created', myApp.resultPath + '/');
    removeDir(myApp.tempPath);
};

ipcMain.on('create-img', (event, params) => {
    removeDir(myApp.resultPath);
    mkDir(myApp.resultPath);
    mkDir(myApp.tempPath);
    const textToSVG = TextToSVG.loadSync(myApp.fontPath);
    let mask = 0;

    myApp.data.forEach((item, index) => {
        item[0] = item[0] + '';
        if (!item[0]) {
            mask++;
            return false;
        }
        const fileName = index + '_' + item[0].replace(/(^\s*)|(\s*$)/g, '');
        Promise.all(
            params.tr.map(async (st, j) => {
                item[j] = item[j] + '';
                if (st.style === 'avatar') {
                    await download(item[j], myApp.tempPath, { filename: index + '.png' });
                    const roundedCorners = Buffer.from(`<svg><circle r="${st.font / 2}" cx="${st.font / 2}" cy="${st.font / 2}"/></svg>`);
                    const buff = await sharp(`${myApp.tempPath}/${index}.png`)
                        .resize(st.font, st.font)
                        .composite([
                            {
                                input: roundedCorners,
                                blend: 'dest-in'
                            }
                        ])
                        .png()
                        .toBuffer();
                    return {
                        input: buff,
                        blend: 'over',
                        top:  Math.round(st.y - st.font / 2),
                        left: Math.max(0, st.align === 'center' ? Math.round(st.x - st.font / 2) : st.align === 'right' ? Math.round(st.x - st.font) : st.x)
                    };
                } else {
                    const name = item[j].replace(/(^\s*)|(\s*$)/g, '');
                    const options = getWordSvg(textToSVG, name, st.font, st.color);
                    if (st.selected) {
                        return {
                            input: options.svgPath,
                            blend: 'over',
                            top: Math.round(st.y - options.height / 2),
                            left: Math.max(0, st.align === 'center' ? Math.round(st.x - options.width / 2) : st.align === 'right' ? Math.round(st.x - options.width) : st.x)
                        };
                    } else {
                        return {};
                    }
                }
            })
        )
            .then((composite) => {
                composite = composite.filter((item) => {
                    return !!item.input;
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
                            event.sender.send('erro', '生成卡片失败');
                        } else {
                            console.log(`${index}.jpg done!`);
                        }
                    });
            })
            .catch((e) => {
                console.log(e);
                event.sender.send('erro', '生成卡片失败');
            });
    });
});
