// ==UserScript==
// @name         Twitch Fullscreen Chat
// @namespace    http://tampermonkey.net/
// @version      1.5.5
// @description  FullScreen Twitch Chat. Functional transparent movable resizable etc.
// @author       EnoxyuM
// @match        https://www.twitch.tv/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const isIframe = window.self !== window.top;

    // Сверхточные (High Specificity) CSS-селекторы для принудительного переопределения фонов Twitch
    const chatInnerCSS = `
        /* Полностью прозрачный фон чата и всех его подложек */
        html:root body,
        html:root body .chat-room,
        html:root body .chat-room__content,
        html:root body .chat-container,
        html:root body .stream-chat-container,
        html:root body .tw-c-background-alt,
        html:root body .tw-c-background-base,
        html:root body .twilight-minimal-root {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Полностью скрываем Топ по подаркам / битсам / клипам */
        html:root body .channel-leaderboard,
        html:root body .channel-leaderboard-header-rotating,
        html:root body .channel-leaderboard-header-rotating__container,
        html:root body .channel-leaderboard-header-rotating-item,
        html:root body .chat-room__header-leaderboard,
        html:root body .chat-room__content > div:first-child:not(.chat-list) {
            display: none !important;
        }

        /* Полностью скрываем шапку чата ("Чат трансляции") */
        html:root body .stream-chat-header,
        html:root body .chat-room__header {
            display: none !important;
        }

        /* Полупрозрачный фон всей нижней панели ввода сообщений (по умолчанию скрыт) */
        html:root body .chat-input,
        html:root body .chat-input-tray__open,
        html:root body .chat-input-container__open,
        html:root body .chat-input-container {
            background-color: rgba(20, 20, 25, 0.45) !important;
            background: rgba(20, 20, 25, 0.45) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 0.25s ease-in-out !important;
        }

        /* Показываем панель ввода при наведении мыши ИЛИ когда внутри нее есть фокус ввода (активно пишем) */
        html:root body:hover .chat-input,
        html:root body:hover .chat-input-tray__open,
        html:root body:hover .chat-input-container__open,
        html:root body:hover .chat-input-container,
        html:root body .chat-input:focus-within,
        html:root body .chat-input-container:focus-within {
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        /* Очищаем фон у всех вложенных элементов поля ввода, чтобы просвечивала прозрачность */
        html:root body .chat-input *,
        html:root body .chat-input-tray__open *,
        html:root body .chat-input-container__open *,
        html:root body .chat-input-container * {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* Добавляем легкое выделение для самого текстового поля ввода */
        html:root body .chat-input__textarea {
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            background-color: rgba(0, 0, 0, 0.25) !important;
            border-radius: 4px !important;
        }

        /* Текст ввода внутри поля */
        html:root body .chat-input__textarea textarea {
            color: rgba(255, 255, 255, 0.85) !important;
        }

        /* Полупрозрачные иконки и кнопки отправки */
        html:root body .chat-input__buttons-container {
            opacity: 0.7 !important;
        }

        /* === НАСТРОЙКА СКРЫТИЯ СКРОЛЛБАРА === */

        /* 1. По умолчанию скрываем скроллбар в Firefox */
        html:root body,
        html:root body *,
        html:root body .chat-list,
        html:root body .simplebar-content-wrapper {
            scrollbar-width: none !important;
        }

        /* 2. По умолчанию скрываем скроллбар в Chrome / Edge / Brave (Webkit) */
        html:root body ::-webkit-scrollbar,
        html:root body *::-webkit-scrollbar {
            width: 6px !important;
            height: 6px !important;
            background: transparent !important;
        }
        html:root body ::-webkit-scrollbar-thumb,
        html:root body *::-webkit-scrollbar-thumb {
            background: transparent !important; /* Невидимый ползунок */
            border-radius: 3px !important;
        }

        /* 3. По умолчанию скрываем скроллбар в Simplebar (если остался в системе) */
        html:root body .simplebar-scrollbar {
            opacity: 0 !important;
            transition: opacity 0.25s ease-in-out !important;
        }
        html:root body .simplebar-scrollbar::before {
            background-color: rgba(255, 255, 255, 0.4) !important;
        }

        /* === ОТОБРАЖЕНИЕ СКРОЛЛБАРА ПРИ НАВЕДЕНИИ МЫШИ НА ЧАТ === */

        /* 1. Для Firefox */
        html:root body:hover,
        html:root body:hover *,
        html:root body:hover .chat-list,
        html:root body:hover .simplebar-content-wrapper {
            scrollbar-width: thin !important;
        }

        /* 2. Для Chrome / Edge / Brave (Webkit) */
        html:root body:hover ::-webkit-scrollbar-thumb,
        html:root body:hover *::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.35) !important; /* Полупрозрачный белый */
        }

        /* 3. Для Simplebar */
        html:root body:hover .simplebar-scrollbar {
            opacity: 0.3 !important;
        }

        /* Черная контурная обводка для текста сообщений, ников, меток времени и системных сообщений */
        html:root body .chat-line__message,
        html:root body .chat-line__message *,
        html:root body .chat-line__status,
        html:root body .chat-line__status *,
        html:root body .text-fragment,
        html:root body .mention-fragment,
        html:root body .chat-author__display-name,
        html:root body .chat-line__timestamp {
            text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0px 0px 2px #000 !important;
        }
    `;

    if (isIframe) {
        // Если мы внутри iframe чата, внедряем стили напрямую
        if (window.location.pathname.includes('/chat')) {
            const style = document.createElement('style');
            style.id = 'tm-fullscreen-chat-inner-styles';
            style.innerHTML = chatInnerCSS;
            const appendStyles = () => {
                const target = document.head || document.documentElement;
                if (target) target.appendChild(style);
            };
            if (document.head || document.documentElement) {
                appendStyles();
            } else {
                document.addEventListener('DOMContentLoaded', appendStyles);
            }
        }
        return;
    }

    // --- ЛОГИКА ДЛЯ ОСНОВНОЙ СТРАНИЦЫ ---

    const style = document.createElement('style');
    style.innerHTML = `
        /* Кнопка скрытия/показа чата по умолчанию скрыта во всех обычных режимах */
        #tm-chat-toggle-btn {
            display: none !important;
        }

        /* Кнопка отображается только во время полноэкранного режима */
        :fullscreen #tm-chat-toggle-btn,
        [data-fs-chat-active="true"] #tm-chat-toggle-btn {
            display: inline-flex !important;
        }

        /* Скрываем оригинальный чат в полноэкранном режиме, чтобы избежать дублирования */
        :fullscreen .channel-root__right-column,
        :fullscreen .right-column {
            display: none !important;
        }

        /* Контейнер чата в полноэкранном режиме (парит поверх видео) */
        .tm-fullscreen-chat-container {
            position: fixed !important;
            width: 340px;
            height: 100vh;
            min-height: 150px;
            max-height: 100vh;
            z-index: 100000 !important;
            display: flex !important;
            flex-direction: column !important;
            background: transparent !important;
            box-sizing: border-box !important;
        }

        /* Панель управления и ползунки изменения размера по умолчанию скрыты (прозрачны) */
        .tm-fullscreen-chat-container .tm-chat-toolbar,
        .tm-fullscreen-chat-container .tm-resize-handle {
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 0.25s ease-in-out !important;
        }

        /* Плавно показываем их при наведении мыши на сам контейнер чата */
        .tm-fullscreen-chat-container:hover .tm-chat-toolbar,
        .tm-fullscreen-chat-container:hover .tm-resize-handle {
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        /* Панель управления над чатом */
        .tm-chat-toolbar {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: rgba(14, 14, 16, 0.6) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding: 2px 5px !important;
            height: 24px !important;
            min-height: 24px !important;
            box-sizing: border-box !important;
            user-select: none !important;
        }

        /* Маленькие, полупрозрачные кнопки привязки */
        .tm-chat-btn {
            background: transparent !important;
            border: none !important;
            color: rgba(255, 255, 255, 0.5) !important;
            font-size: 11px !important;
            cursor: pointer !important;
            padding: 0 5px !important;
            height: 18px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 3px !important;
            transition: all 0.2s !important;
        }
        .tm-chat-btn:hover {
            color: rgba(255, 255, 255, 0.9) !important;
            background: rgba(255, 255, 255, 0.1) !important;
        }

        /* Иконка перетаскивания в центре панели */
        .tm-drag-handle {
            flex-grow: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            cursor: move !important;
            color: rgba(255, 255, 255, 0.4) !important;
            font-size: 14px !important;
            line-height: 1 !important;
            height: 100% !important;
        }
        .tm-drag-handle:hover {
            color: rgba(255, 255, 255, 0.8) !important;
        }

        /* iframe чата растягивается под панелью управления */
        .tm-fullscreen-chat-container .tm-fullscreen-chat-iframe {
            display: block !important;
            width: 100% !important;
            height: calc(100% - 24px) !important;
            border: none !important;
            background: transparent !important;
        }

        /* Ползунки для изменения размера */
        .tm-resize-handle {
            position: absolute !important;
            left: 0 !important;
            width: 100% !important;
            height: 6px !important;
            z-index: 100002 !important;
        }
        .tm-resize-top {
            top: -3px !important;
            cursor: ns-resize !important;
        }
        .tm-resize-bottom {
            bottom: -3px !important;
            cursor: ns-resize !important;
        }

        /* КОГДА ЧАТ СКРЫТ КНОПКОЙ */
        .video-player[data-fs-chat-hidden="true"] .tm-fullscreen-chat-container {
            display: none !important;
        }

        /* Видео возвращается на полные 100% ширины, если чат выключен */
        .video-player[data-fs-chat-hidden="true"] .video-ref,
        .video-player[data-fs-chat-hidden="true"] [data-a-target="video-ref"],
        .video-player[data-fs-chat-hidden="true"] .video-player__default-player {
            width: 100% !important;
            max-width: 100% !important;
        }

        /* Элементы управления растягиваются на весь экран, если чат выключен */
        .video-player[data-fs-chat-hidden="true"] .video-player__overlay,
        .video-player[data-fs-chat-hidden="true"] .player-controls,
        .video-player[data-fs-chat-hidden="true"] .video-player__controls,
        .video-player[data-fs-chat-hidden="true"] .player-overlay-background,
        .video-player[data-fs-chat-hidden="true"] .video-player__top-overlay {
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
        }
    `;

    const appendStyle = () => {
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.documentElement.appendChild(style);
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', appendStyle);
    } else {
        appendStyle();
    }

    const getChannelName = () => {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
            const firstPart = pathParts[0];
            if (!['directory', 'videos', 'u', 'search', 'moderator', 'popout', 'creator-page', 'p'].includes(firstPart)) {
                return firstPart;
            }
        }
        return null;
    };

    // Загрузка сохраненных координат и размеров чата
    const loadChatPositionAndSize = (container) => {
        const savedLeft = localStorage.getItem('tm-chat-left');
        const savedTop = localStorage.getItem('tm-chat-top');
        const savedHeight = localStorage.getItem('tm-chat-height');
        const savedWidth = localStorage.getItem('tm-chat-width');

        if (savedLeft !== null) {
            container.style.left = savedLeft;
        } else {
            container.style.right = '0px'; // По умолчанию справа
        }

        if (savedTop !== null) container.style.top = savedTop;
        else container.style.top = '0px';

        if (savedHeight !== null) container.style.height = savedHeight;
        else container.style.height = '100vh';

        if (savedWidth !== null) container.style.width = savedWidth;
        else container.style.width = '340px';
    };

    // Логика перетаскивания (Drag & Drop)
    const initDrag = (container, dragHandle) => {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        dragHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            container.style.right = ''; // Очищаем right при переходе на left-позиционирование
            container.style.left = `${startLeft}px`;
            container.style.top = `${startTop}px`;

            // Создаем невидимый защитный оверлей во весь экран внутри плеера
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:100005;cursor:move;';
            overlay.id = 'tm-drag-overlay';
            if (container.parentNode) {
                container.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }

            const onMouseMove = (moveEvent) => {
                if (!isDragging) return;
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                let newLeft = startLeft + deltaX;
                let newTop = startTop + deltaY;

                const maxLeft = window.innerWidth - rect.width;
                const maxTop = window.innerHeight - rect.height;

                newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                newTop = Math.max(0, Math.min(newTop, maxTop));

                container.style.left = `${newLeft}px`;
                container.style.top = `${newTop}px`;
            };

            const onMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const overlay = document.getElementById('tm-drag-overlay');
                if (overlay) overlay.remove();

                localStorage.setItem('tm-chat-left', container.style.left);
                localStorage.setItem('tm-chat-top', container.style.top);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };

    // Логика изменения размера по вертикали
    const initResize = (container, topHandle, bottomHandle) => {
        const startResize = (e, isTop) => {
            e.preventDefault();
            const startY = e.clientY;
            const rect = container.getBoundingClientRect();
            const startHeight = rect.height;
            const startTop = rect.top;

            // Защитный оверлей во весь экран внутри плеера
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:100005;cursor:ns-resize;';
            overlay.id = 'tm-resize-overlay';
            if (container.parentNode) {
                container.parentNode.appendChild(overlay);
            } else {
                document.body.appendChild(overlay);
            }

            const onMouseMove = (moveEvent) => {
                const deltaY = moveEvent.clientY - startY;

                if (isTop) {
                    let newHeight = startHeight - deltaY;
                    let newTop = startTop + deltaY;

                    if (newHeight >= 150 && newTop >= 0) {
                        container.style.height = `${newHeight}px`;
                        container.style.top = `${newTop}px`;
                    }
                } else {
                    let newHeight = startHeight + deltaY;
                    const maxHeight = window.innerHeight - startTop;

                    newHeight = Math.max(150, Math.min(newHeight, maxHeight));
                    container.style.height = `${newHeight}px`;
                }
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const overlay = document.getElementById('tm-resize-overlay');
                if (overlay) overlay.remove();

                localStorage.setItem('tm-chat-height', container.style.height);
                localStorage.setItem('tm-chat-top', container.style.top);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        topHandle.addEventListener('mousedown', (e) => startResize(e, true));
        bottomHandle.addEventListener('mousedown', (e) => startResize(e, false));
    };

    // Логика быстрого прижатия влево/вправо (Snapping) без сброса высоты
    const initSnapping = (container, btnLeft, btnRight) => {
        btnLeft.addEventListener('click', () => {
            container.style.right = '';
            container.style.left = '0px';
            localStorage.setItem('tm-chat-left', '0px');
        });

        btnRight.addEventListener('click', () => {
            const rect = container.getBoundingClientRect();
            const leftVal = `${window.innerWidth - rect.width}px`;
            container.style.right = '';
            container.style.left = leftVal;
            localStorage.setItem('tm-chat-left', leftVal);
        });
    };

    // Обновление состояния видимости чата во время полноэкранного режима
    const updateChatVisibilityState = () => {
        const isHidden = localStorage.getItem('tm-chat-hidden') === 'true';
        const player = document.querySelector('.video-player');
        const container = document.querySelector('.tm-fullscreen-chat-container');
        const toggleBtn = document.getElementById('tm-chat-toggle-btn');

        if (player) {
            if (isHidden) {
                player.setAttribute('data-fs-chat-hidden', 'true');
            } else {
                player.removeAttribute('data-fs-chat-hidden');
            }
        }

        if (container) {
            if (isHidden) {
                container.style.setProperty('display', 'none', 'important');
            } else {
                container.style.setProperty('display', 'flex', 'important');
            }
        }

        if (toggleBtn) {
            const svg = toggleBtn.querySelector('svg');
            if (svg) {
                // Если скрыт, иконка становится полупрозрачной
                svg.style.fill = isHidden ? 'rgba(255, 255, 255, 0.4)' : 'white';
            }
        }
    };

    // Создание кнопки скрытия/показа чата в интерфейсе Twitch
    const createChatToggleButton = () => {
        if (document.getElementById('tm-chat-toggle-btn')) {
            updateChatVisibilityState(); // Убеждаемся, что визуальное состояние актуально
            return;
        }

        const controlGroup = document.querySelector('.player-controls__right-control-group');
        if (!controlGroup) return;

        const btn = document.createElement('button');
        btn.id = 'tm-chat-toggle-btn';
        btn.className = 'ScCoreButton-sc-1qn4ixc-0 cgCHoV ScButtonIcon-sc-o7ndmn-0 dKvQD tm-chat-toggle-button';
        btn.setAttribute('aria-label', 'Toggle Fullscreen Chat');

        // SVG иконка белого чата
        btn.innerHTML = `
            <div class="ButtonIconFigure-sc-1ttmz5m-0 fbCCvx" style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;">
                <svg width="20px" height="20px" viewBox="0 0 20 20" x="0px" y="0px" style="fill: white; transition: fill 0.2s;">
                    <path d="M4 2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4v-4H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v10h1.414L8 16.586V14h8V4H4z"/>
                </svg>
            </div>
        `;

        btn.style.cssText = `
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 2px;
            border-radius: 4px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 6px;
            transition: background-color 0.2s;
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'transparent';
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = localStorage.getItem('tm-chat-hidden') === 'true';
            localStorage.setItem('tm-chat-hidden', String(!isHidden));
            updateChatVisibilityState();
        });

        // Вставляем кнопку рядом с кнопкой создания клипа
        const clipBtn = controlGroup.querySelector('[data-a-target="player-clip-button"]');
        if (clipBtn) {
            clipBtn.parentNode.insertBefore(btn, clipBtn.nextSibling);
        } else {
            controlGroup.insertBefore(btn, controlGroup.firstChild);
        }

        updateChatVisibilityState();
    };

    // Периодически инициируем инъекцию кнопки (необходимо для SPA)
    setInterval(createChatToggleButton, 1000);

    const onFullscreenChange = () => {
        const fsElement = document.fullscreenElement ||
                          document.webkitFullscreenElement ||
                          document.mozFullScreenElement ||
                          document.msFullscreenElement;

        if (fsElement) {
            const player = fsElement.classList.contains('video-player')
                ? fsElement
                : fsElement.querySelector('.video-player');

            if (player) {
                if (!player.querySelector('.tm-fullscreen-chat-container')) {
                    const channelName = getChannelName();
                    if (channelName) {
                        // Создаем интерактивный контейнер чата
                        const container = document.createElement('div');
                        container.className = 'tm-fullscreen-chat-container';
                        container.innerHTML = `
                            <div class="tm-resize-handle tm-resize-top"></div>
                            <div class="tm-chat-toolbar">
                                <button class="tm-chat-btn tm-snap-left">&lt;-</button>
                                <div class="tm-drag-handle">⠿</div>
                                <button class="tm-chat-btn tm-snap-right">-&gt;</button>
                            </div>
                            <iframe class="tm-fullscreen-chat-iframe"></iframe>
                            <div class="tm-resize-handle tm-resize-bottom"></div>
                        `;

                        const iframe = container.querySelector('.tm-fullscreen-chat-iframe');
                        const parentDomain = window.location.hostname;
                        iframe.src = `https://www.twitch.tv/embed/${channelName}/chat?parent=${parentDomain}&darkpopout`;

                        // Внедряем стили прозрачности при загрузке
                        iframe.addEventListener('load', () => {
                            try {
                                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                                if (iframeDoc) {
                                    const iframeStyle = iframeDoc.createElement('style');
                                    iframeStyle.id = 'tm-fullscreen-chat-inner-styles';
                                    iframeStyle.innerHTML = chatInnerCSS;
                                    iframeDoc.head.appendChild(iframeStyle);
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        });

                        // Настраиваем положение и размер
                        loadChatPositionAndSize(container);

                        // Сначала добавляем контейнер в DOM, чтобы его родителем стал плеер
                        player.appendChild(container);
                        player.setAttribute('data-fs-chat-active', 'true');

                        // Инициализируем перетаскивание, ресайз и кнопки привязки
                        const dragHandle = container.querySelector('.tm-drag-handle');
                        const topHandle = container.querySelector('.tm-resize-top');
                        const bottomHandle = container.querySelector('.tm-resize-bottom');
                        const btnLeft = container.querySelector('.tm-snap-left');
                        const btnRight = container.querySelector('.tm-snap-right');

                        initDrag(container, dragHandle);
                        initResize(container, topHandle, bottomHandle);
                        initSnapping(container, btnLeft, btnRight);
                    }
                }
            }
        } else {
            const containers = document.querySelectorAll('.tm-fullscreen-chat-container');
            containers.forEach(c => c.remove());

            const activePlayers = document.querySelectorAll('[data-fs-chat-active="true"]');
            activePlayers.forEach(player => {
                player.removeAttribute('data-fs-chat-active');
            });
        }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
})();
