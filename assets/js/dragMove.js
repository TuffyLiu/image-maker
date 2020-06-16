(function (root, factory) {
    if (typeof exports === 'object' && typeof module === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define([], factory);
    else if (typeof exports === 'object') exports['DragMove'] = factory();
    else root['DragMove'] = factory();
})(this, function () {
    const { ipcRenderer } = require('electron');
    /**
     * 拖拽移动函数，只需要初始化一次。不许时调用destory函数进行注销
     * @param {[type]} dragEl      要拖动的元素
     * @param {[type]} targetEl 拖动事件生效的元素
     */
    function DragMove(dragEl, targetEl, option) {
        var stx, sty, ox, oy;

        option = option || {};

        targetEl.style.cursor = 'move';
        targetEl.style.userSelect = 'none';

        dragEl.style.left = dragEl.offsetLeft + 'px';
        dragEl.style.top = dragEl.offsetTop + 'px';
        dragEl.style.width = dragEl.offsetWidth + 'px';
        dragEl.style.height = dragEl.offsetHeight + 'px';

        var startHandler = function (event) {
            stx = event.pageX;
            sty = event.pageY;
            ox = dragEl.offsetLeft;
            oy = dragEl.offsetTop;

            dragEl.style.position = 'absolute';
            dragEl.style.left = ox + 'px';
            dragEl.style.top = oy + 'px';

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', endHandler);
        };

        var moveHandler = function (event) {
            let mx = event.pageX - stx;
            let my = event.pageY - sty;

            dragEl.style.left = ox + mx + 'px';
            dragEl.style.top = oy + my + 'px';
        };

        var endHandler = function (event) {
            if (option.callBack) {
                option.callBack({
                    id: option.id,
                    x: Math.round(dragEl.style.left.replace('px', '')),
                    y: Math.round(dragEl.style.top.replace('px', '')),
                });
            }
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', endHandler);
        };

        this.destory = function () {
            targetEl.removeEventListener('mousedown', startHandler);
        };

        this.update = function () {
            dragEl.style.width = dragEl.children[0].style.width;
            dragEl.style.height = dragEl.children[0].style.height;
            console.log(dragEl.children[0]);
        };

        targetEl.addEventListener('mousedown', startHandler);
    }
    return DragMove;
});
