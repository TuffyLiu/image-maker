// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const { ipcRenderer } = require('electron');

const DragMove = require('./assets/js/dragMove.js');

const myApp = {
    imgPath: '',
    fontPath: '',
    excelPath: '',
    resultPath: '',
    imgRawWidth: 0,
    imgRawHeight: 0,
    ratio: 0,
    wordDom: document.getElementById('word'),
    imgDom: document.getElementById('temp-img'),
    tbodyDom: document.getElementById('table-tbody'),
    header: ['姓名']
};

const resultSelectBtn = document.getElementById('result-select-btn');
resultSelectBtn.addEventListener('click', (event) => {
    // showLoading();
    ipcRenderer.send('open-result-dialog');
});
ipcRenderer.on('selected-result', (event, path) => {
    hideLoading();
    document.getElementById('result-select-path').innerText = path;
    myApp.resultPath = path;
});

const fontSelectBtn = document.getElementById('font-select-btn');
fontSelectBtn.addEventListener('click', (event) => {
    // showLoading();
    ipcRenderer.send('open-font-dialog');
});
ipcRenderer.on('selected-font', (event, path) => {
    hideLoading();
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = `
        @font-face{
            font-family: ElectronFont;
            src: url('${path}');
        }
        .word-container {
            font-family: ElectronFont;
        }
    `;
    document.head.appendChild(style);
    document.getElementById('font-select-path').innerText = path;
    myApp.fontPath = path;
});

// myApp.fontSelect.addEventListener('change', (event) => {
//     myApp.wordDom.style.fontFamily = event.target.value;
// });

const imgSelectBtn = document.getElementById('img-select-btn');
imgSelectBtn.addEventListener('click', (event) => {
    // showLoading();
    ipcRenderer.send('open-img-dialog');
});
ipcRenderer.on('selected-img', (event, path) => {
    hideLoading();
    document.getElementById('img-select-path').innerText = path;
    myApp.imgPath = path;
    myApp.imgDom.src = path;
    const im = document.createElement('img');
    im.src = path;
    im.onload = () => {
        myApp.imgRawWidth = im.width;
        myApp.imgRawHeight = im.height;
        myApp.ratio = 500 / im.width;
    };
});

const excelSelectBtn = document.getElementById('excel-select-btn');
excelSelectBtn.addEventListener('click', (event) => {
    // showLoading();
    ipcRenderer.send('open-excel-dialog');
});

ipcRenderer.on('selected-excel', (event, parmas) => {
    hideLoading();
    myApp.excelPath = parmas.path;
    document.getElementById('excel-select-path').innerText = parmas.path;
    myApp.header = parmas.header;
    myApp.tbodyDom.innerHTML = '';
    myApp.wordDom.innerHTML = '';
    parmas.header.forEach((item, index) => {
        const defaultFont = myApp.imgDom.naturalWidth ? Math.ceil(myApp.imgDom.naturalWidth / 20) : 100;
        const div = document.createElement('div');
        const move = document.createElement('div');
        move.className = 'move';
        div.className = 'drag';
        div.appendChild(move);

        const img = document.createElement('img');
        img.src = './assets/img/avater.png';
        img.style.height = 'auto';
        img.style.borderRadio = '50%';
        img.style.width = Math.round(defaultFont * myApp.ratio) + 'px';
        img.style.height = Math.round(defaultFont * myApp.ratio) + 'px';

        const span = document.createElement('span');
        span.id = `span_${index}`;
        span.innerText = item;
        span.style.fontSize = Math.round(defaultFont * myApp.ratio) + 'px';
        span.style.lineHeight = '1';
        span.style.color = '#333';
        span.style.textAlign = 'center';
        div.style.left = '0px';
        div.style.top = index * defaultFont + 30 + 'px';
        div.style.visibility = 'visible';
        div.appendChild(span);
        myApp.wordDom.appendChild(div);

        const tr = document.createElement('tr');
        tr.id = `tr_${index}`;

        const tdName = document.createElement('td');
        tdName.innerText = item;
        tr.appendChild(tdName);

        const tdX = document.createElement('td');
        const inputX = document.createElement('input');
        inputX.value = 0;
        inputX.type = 'number';
        inputX.name = 'x';
        inputX.addEventListener('change', (event) => {
            const width = div.style.width.replace('px', '');
            let x = event.target.value * myApp.ratio;
            if (selectAlign.value === 'center') {
                x = x - width / 2;
            } else if (selectAlign.value === 'right') {
                x = x - width;
            } else {
                x = x;
            }
            div.style.left = x + 'px';
        });
        tdX.appendChild(inputX);
        tr.appendChild(tdX);

        const tdY = document.createElement('td');
        const inputY = document.createElement('input');
        inputY.value = index * 200;
        inputY.type = 'number';
        inputY.name = 'y';
        inputY.addEventListener('change', (event) => {
            div.style.top = event.target.value * myApp.ratio + 'px';
        });
        tdY.appendChild(inputY);
        tr.appendChild(tdY);

        const drag = new DragMove(div, move, {
            id: index,
            callBack: (option) => {
                let x = 0;
                const width = div.style.width.replace('px', '');
                if (selectAlign.value === 'center') {
                    x = option.x + width / 2;
                } else if (selectAlign.value === 'right') {
                    x = option.x + Math.round(width);
                } else {
                    x = option.x;
                }
                inputX.value = Math.round(x / myApp.ratio);
                inputY.value = Math.round(option.y / myApp.ratio);
            }
        });

        const tdAlign = document.createElement('td');
        const selectAlign = document.createElement('select');
        selectAlign.innerHTML = `
            <option value="center" selected>居中</option>
            <option value="left">左对齐</option>
            <option value="right">右对其</option>
        `;
        selectAlign.addEventListener('change', (event) => {
            let x = 0;
            const left = div.style.left.replace('px', '');
            const width = span.style.width.replace('px', '');
            if (selectAlign.value === 'center') {
                x = +left + width / 2;
            } else if (selectAlign.value === 'right') {
                x = +left + width;
            } else {
                x = left;
            }
            inputX.value = Math.round(x / myApp.ratio);
        });
        tdAlign.appendChild(selectAlign);
        tr.appendChild(tdAlign);

        const tdFont = document.createElement('td');
        const inputFont = document.createElement('input');
        inputFont.value = defaultFont;
        inputFont.type = 'number';
        inputFont.name = 'font';
        inputFont.addEventListener('change', (event) => {
            span.style.fontSize = Math.round(event.target.value * myApp.ratio) + 'px';
            img.style.width = Math.round(event.target.value * myApp.ratio) + 'px';
            img.style.height = Math.round(event.target.value * myApp.ratio) + 'px';
        });
        tdFont.appendChild(inputFont);
        tr.appendChild(tdFont);

        const tdColor = document.createElement('td');
        const inputColor = document.createElement('input');
        inputColor.value = '#333';
        inputColor.type = 'text';
        inputColor.name = 'color';
        inputColor.addEventListener('change', (event) => {
            span.style.color = event.target.value;
        });
        tdColor.appendChild(inputColor);
        tr.appendChild(tdColor);

        const tdStyle = document.createElement('td');
        const selectStyle = document.createElement('select');
        selectStyle.innerHTML = `
            <option value="word" selected>文本</option>
            <option value="avatar">头像</option>
        `;
        selectStyle.addEventListener('change', (event) => {
            if (selectStyle.value === 'avatar') {
                span.innerText = '';
                span.appendChild(img);
            } else {
                span.removeChild(img);
                span.innerText = item;
            }
        });
        tdStyle.appendChild(selectStyle);
        tr.appendChild(tdStyle);

        const tdShow = document.createElement('td');
        const inputShow = document.createElement('input');
        inputShow.type = 'checkbox';
        inputShow.checked = true;
        inputShow.name = 'show';

        inputShow.addEventListener('change', (event) => {
            div.style.visibility = event.target.checked ? 'visible' : 'hidden';
        });
        tdShow.appendChild(inputShow);
        tr.appendChild(tdShow);

        myApp.tbodyDom.appendChild(tr);
    });
});

const createBtn = document.getElementById('create-btn');
const loading = document.getElementById('loading');
createBtn.addEventListener('click', (event) => {
    if (!myApp.imgPath) {
        alert('请选择图片模版');
        return false;
    } else if (!myApp.excelPath) {
        alert('请选择Excel数据');
        return false;
    } else if (!myApp.resultPath) {
        alert('请选择保存文件夹');
        return false;
    }
    const setting = myApp.header.map((item, index) => {
        const input = document.getElementById('tr_' + index).getElementsByTagName('input');
        const select = document.getElementById('tr_' + index).getElementsByTagName('select');
        return {
            x: +input[0].value,
            y: +input[1].value,
            font: +input[2].value,
            color: input[3].value,
            selected: input[4].checked,
            align: select[0].value,
            style: select[1].value
        };
    });
    showLoading();
    ipcRenderer.send('create-img', {
        tr: setting
    });
});

ipcRenderer.on('finish-created', (event, resultPath) => {
    hideLoading();
    const myNotification = new Notification('批量生成成功!', {
        body: '卡片路径: ' + resultPath
    });
});

ipcRenderer.on('finish-loading', (event, resultPath) => {
    hideLoading();
});

ipcRenderer.on('show-loading', (event, resultPath) => {
    showLoading();
});

ipcRenderer.on('erro', (event) => {
    hideLoading();
    const myNotification = new Notification('生成卡片失败!', {
        body: '生成卡片失败~~请重新尝试!!'
    });
});

function showLoading() {
    loading.style.visibility = 'visible';
}

function hideLoading() {
    loading.style.visibility = 'hidden';
}
