'use strict';

const EVENT_NAMES = {
    blur: 'blur',
    change: 'change',
    click: 'click',
    DOMContentLoaded: 'DOMContentLoaded',
    focus: 'focus',
    load: 'load',
    transitionEnd: 'transitionend'
};

window.addEventListener(EVENT_NAMES.DOMContentLoaded, () => {
    //=================================================================================
    // Create nav bar
    const navBarRootElem = document.querySelector('.navBar.sideNav');
    if (!navBarRootElem) {
        console.error('Failed to find navBarRootElem');
        return;
    }
    const mainContentElem = document.getElementsByClassName('mainContent')[0];
    const navBar = NavBar(navBarRootElem, mainContentElem);
    window.addEventListener(EVENT_NAMES.focus, () => { navBar.startUpdate(); });
    window.addEventListener(EVENT_NAMES.blur, () => { navBar.stopUpdate(); });
    navBar.startUpdate();

    //=================================================================================
    // Create project data links for displaying modal on projects that don't have external hrefs
    window.fetch('assets/projects.json').then(response => response.json()).then(projects => {
        const modalRootElem = document.getElementsByClassName('infoModal')[0];
        if (!modalRootElem) {
            console.error('Failed to find modalRootElem');
            return;
        }
        const infoModal = InfoModal(modalRootElem);
        const localProjectLinkElements = document.querySelectorAll('.projectList a[data-project-name]');
        localProjectLinkElements.forEach((linkElement) => {
            linkElement.addEventListener(EVENT_NAMES.click, (clickEvent) => {
                clickEvent.preventDefault();
                const projectName = linkElement.getAttribute('data-project-name');
                const projectData = projects[projectName];
                if (projectData) {
                    infoModal.setData(projectData, true);
                }
                return false;
            });
        });
    });
});


const NavBar = (rootElement, clickToHideElement) => {
    let _prevWinScrollTop = null;
    let _prevWinHeight = null;
    let _navBarItems = [];
    let _isUpdating = false;

    const itemElements = Array.from(rootElement.querySelectorAll('.navBarItems a')).filter(element => element.hasAttribute('data-section-id'));
    const fixedHeaderItem = rootElement.querySelector('.fixedHeader a');
    if (fixedHeaderItem && fixedHeaderItem.hasAttribute('data-section-id')) {
        itemElements.push(fixedHeaderItem);
    }
    const navExpandToggle = rootElement.querySelector('#navExpandToggle');

    function tryCollapseNavBar() {
        if (!navExpandToggle || !navExpandToggle.checked) { return; }
        navExpandToggle.checked = false;
        navExpandToggle.dispatchEvent(new Event(EVENT_NAMES.change));
    }

    //=================================================================================
    // Setup logic for Input checkbox to expand/collapse the nav bar items
    navExpandToggle.addEventListener(EVENT_NAMES.change, (changeEvent) => {
        console.log('got change event ', changeEvent.target.checked);
        const navBarItems = document.getElementsByClassName('navBarItems')[0];
        if (!navBarItems) {
            console.error ('Failed to get element with class navBarItems');
            return;
        }

        if (changeEvent.target.checked) {
            utils.expandElementHeight(navBarItems);
        }
        else {
            utils.collapseElementHeight(navBarItems);
        }
    });
    clickToHideElement.addEventListener(EVENT_NAMES.click, () => {
        const navBarItems = document.getElementsByClassName('navBarItems')[0];
        if (!navBarItems || navBarItems.length === 0) {
            console.error ('Failed to get element with class navBarItems');
            return;
        }
        tryCollapseNavBar();
    });

    //=================================================================================
    // Setup logic for the navbar item links to collapse the nav bar items
    const onNavBarItemClick = () => {
        tryCollapseNavBar();
    };

    const updateActiveState = (activeSectionElement) => {
        if (activeSectionElement === null) {
            _navBarItems.forEach((navBarItem) => { navBarItem.update(null); });
        }
        else {
            _navBarItems.forEach((navBarItem) => { navBarItem.updateActiveState(activeSectionElement.id); });
        }
    };

    //=================================================================================
    // Setup logic to update the highlighted nav bar item on window scroll change
    const update = () => {
        const curScrollY = utils.getWindowScrollY();
        if (_prevWinScrollTop !== curScrollY || _prevWinHeight !== window.innerHeight) {

            let mainVisibleElement = null;
            const winMiddle = window.innerHeight / 2;

            // Find a 'main' visible element, whichever has the most portion on screen
            _navBarItems.forEach((navBarItem) => {
                const sectionElement = navBarItem.getSectionElement();
                const rect = sectionElement.getBoundingClientRect();
                if (rect.top <= window.innerHeight && rect.bottom >= 0) {
                    if (mainVisibleElement === null) {
                        mainVisibleElement = sectionElement;
                    }
                    else {
                        // whichever center is closest to the middle
                        const mainRect = mainVisibleElement.getBoundingClientRect();
                        const mainMiddle = mainRect.top + (mainRect.height / 2);
                        const mainDist = Math.abs(winMiddle - mainMiddle);
                        const curMiddle = rect.top + (rect.height / 2);
                        const curDist = Math.abs(winMiddle, curMiddle);
                        if (curDist < mainDist) {
                            mainVisibleElement = sectionElement;
                        }
                    }
                }
            });

            updateActiveState(mainVisibleElement);

            _prevWinScrollTop = curScrollY;
            _prevWinHeight = window.innerHeight;
        }

        if (_isUpdating)
        {
            window.requestAnimationFrame(update);
        }
    };

    itemElements.forEach((element) => {
        const navBarItem = NavBarItem(element, onNavBarItemClick);
        if (navBarItem) {
            _navBarItems.push(navBarItem);
        }
    });

    return {
        startUpdate: () => {
            if (_isUpdating) {
                return;
            }
            _prevWinHeight = 0;
            _prevWinScrollTop = 0;
            _isUpdating = true;
            update();
        },
        stopUpdate: () => {
            _isUpdating = false;
        }
    };
};

const NavBarItem = (navBarElement, onClickCallback) => {
    if (navBarElement === null || typeof(navBarElement.getAttribute) === 'undefined') {
        console.error ('Failed to create NavBarItem because invalid navBarElement passed in');
        return null;
    }

    const _sectionId = navBarElement.getAttribute('data-section-id');
    if (!_sectionId) {
        console.error('Failed to create NavBarItem with navBarElement because section id is invalid', navBarElement);
        return null;
    }

    const _sectionElement = document.getElementById(_sectionId);
    if (!_sectionId) {
        console.error(`Failed to create NavBarItem because section element not found with id ${_sectionId}`);
        return null;
    }

    navBarElement.addEventListener(EVENT_NAMES.click, (clickEvent) => {
        clickEvent.preventDefault();
        utils.scrollToY(_sectionElement.offsetTop, 1500);

        if (onClickCallback && typeof(onClickCallback) === 'function') {
            onClickCallback();
        }

        return false;
    });

    return {
        updateActiveState: (activeSectionId) => {
            if (activeSectionId === _sectionId) {
                navBarElement.classList.add('activeNavItem');
            }
            else {
                navBarElement.classList.remove('activeNavItem');
            }
        },
        getSectionElement: () => {
            return _sectionElement;
        }
    };
};

const InfoModal = (rootElement) => {
    const _elements = {
        background: rootElement.querySelector('#modalBackground'),
        body: rootElement.querySelector('#modalBody'),
        closeBtn: rootElement.querySelector('#closeBtn'),
        titleText: rootElement.querySelector('#titleText'),
        embedVideoContainer: rootElement.querySelector('#embedVideoContainer'),
        externalLinkContainer: rootElement.querySelector('#externalLinkContainer'),
        descriptionText: rootElement.querySelector('#descriptionText'),
        roleContainer: rootElement.querySelector('#roleContainer'),
        roleText: rootElement.querySelector('#roleText'),
        toolsContainer: rootElement.querySelector('#toolsContainer'),
        toolsList: rootElement.querySelector('#toolsList'),
        tasksContainer: rootElement.querySelector('#tasksContainer'),
        tasksList: rootElement.querySelector('#tasksList'),
    };

    for (const key in _elements) {
        if (Object.prototype.hasOwnProperty.call(_elements, key)) {
            if (!_elements[key]) {
                console.error(`Failed to create InfoModal because of missing element "${key}"`);
                return null;
            }
        }
    }

    function hideModal() {
        rootElement.classList.remove('visible');
        document.body.classList.remove('bodyActiveModal');

        // remove the embeded element if it exists, should avoid any YT vids playing
        const iframeElems = _elements.embedVideoContainer.querySelectorAll('iframe');
        iframeElems.forEach(elem => elem.remove());
    }

    function showModal() {
        rootElement.classList.add('visible');
        document.body.classList.add('bodyActiveModal');
        rootElement.offsetTop; // force reflow?
        _elements.body.scrollTop = 0;
    }

    function getOrCreateLiElement(ulElement, index) {
        if (index < ulElement.children.length) {
            const liElement = ulElement.children[index];
            if (liElement.nodeType === Node.ELEMENT_NODE && liElement.tagName.toLowerCase() === 'li') {
                return liElement;
            }
        }

        const liElement = document.createElement('li');
        ulElement.appendChild(liElement);

        return liElement;
    }

    function updateList(ulElement, data) {
        let dataIndex = 0;
        for (; dataIndex < data.length; ++dataIndex) {
            const liElement = getOrCreateLiElement(ulElement, dataIndex);
            liElement.style.display = null;
            liElement.textContent = data[dataIndex];
        }

        for (let leftOverIndex = dataIndex; leftOverIndex < ulElement.children.length; ++leftOverIndex) {
            ulElement.children[leftOverIndex].style.display = 'none';
        }
    }

    _elements.closeBtn.addEventListener(EVENT_NAMES.click, () => {
        hideModal();
    });

    _elements.background.addEventListener(EVENT_NAMES.click, (clickEvent) => {
        clickEvent.preventDefault();
        hideModal();
        return false;
    });

    return {
        setData: (data, showNow) => {
            _elements.titleText.textContent = data.title;
            _elements.descriptionText.textContent = data.description;
            if (data.embedVideos && data.embedVideos.length) {
                _elements.embedVideoContainer.style.display = null;
                _elements.embedVideoContainer.classList.add('loading');
                let loadedCount = 0;
                data.embedVideos.forEach((embedData) => {
                    const iframeElem = document.createElement('iframe');
                    console.log(`>>> loading iframeElem (${embedData}) at ${Date.now()}`);
                    iframeElem.addEventListener(EVENT_NAMES.load, () => {
                        console.log(`>>> loaded iframeElem (${embedData}) at ${Date.now()}`);
                        ++loadedCount;
                        if (loadedCount === data.embedVideos.length) {
                            _elements.embedVideoContainer.classList.remove('loading');
                        }
                    });
                    iframeElem.setAttribute('src', embedData);
                    iframeElem.setAttribute('allowfullscreen', 'true');
                    _elements.embedVideoContainer.appendChild(iframeElem);
                });
            }
            else {
                _elements.embedVideoContainer.style.display = 'none';
            }
            if (data.externalLinks && data.externalLinks.length) {
                _elements.externalLinkContainer.style.display = null;
                _elements.externalLinkContainer.innerHTML = '';

                data.externalLinks.forEach((linkData) => {
                    const linkElem = document.createElement('a');
                    linkElem.setAttribute('href', linkData.url);
                    linkElem.textContent = linkData.text;
                    _elements.externalLinkContainer.appendChild(linkElem);
                    _elements.externalLinkContainer.appendChild(document.createElement('br'));
                });
            }
            else {
                _elements.externalLinkContainer.style.display = 'none';
            }
            if (data.role) {
                _elements.roleContainer.style.display = null;
                _elements.roleText.textContent = data.role;
            }
            else {
                _elements.roleContainer.style.display = 'none';
            }
            if (data.tools && data.tools.length) {
                _elements.toolsContainer.style.display = null;
                updateList(_elements.toolsList, data.tools);
            }
            else {
                _elements.toolsContainer.style.display = 'none';
            }
            if (data.tasks && data.tasks.length) {
                _elements.tasksContainer.style.display = null;
                updateList(_elements.tasksList, data.tasks);
            }
            else {
                _elements.tasksContainer.style.display = 'none';
            }
            if (showNow) {
                showModal();
            }
        },
        show: () => {
            showModal();
        },
        hide: () => {
            hideModal();
        }
    };
};

const utils = {
    getWindowScrollY: () => {
        return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    },
    collapseElementHeight: (element) => {
        const elemHeight = element.scrollHeight; // get the inner content height
        const elemTransition = element.style.transition; // cache the css transitions before we clear it

        if (parseInt(elemHeight) === 0) {
            console.log(`collapseElement() doing nothing because element height is ${elemHeight}`);
            return;
        }

        element.style.transition = '';

        // on the next style update/frame set the height in px and re-apply the transition value
        window.requestAnimationFrame(() => {
            element.style.height = `${elemHeight}px`;
            element.style.transition = elemTransition;

            // then, on the next next frame, have the element transition height to 0
            window.requestAnimationFrame(() => {
                element.classList.remove('expanded');
                element.style.height = null;
            });
        });
    },
    expandElementHeight: (element) => {
        const elemHeight = element.scrollHeight;

        element.style.height = `${elemHeight}px`; // have element transition to height of content in pixels, overriding auto height
        element.classList.add('expanded');
        const onTransitionEnd = function() {
            element.removeEventListener(EVENT_NAMES.transitionEnd, onTransitionEnd);
            element.style.height = null; // clear inline height
        };

        element.addEventListener(EVENT_NAMES.transitionEnd, onTransitionEnd);
    },
    scrollToY: (scrollTargetY, speed) => {

        const DEFAULT_SPEED = 2000;
        const DEFUALT_SCROLLY = 0;
        const MIN_TIME = 0.1;
        const MAX_TIME = 0.8;
        const scrollY = utils.getWindowScrollY();
        const totalTime = Math.max(MIN_TIME, Math.min(Math.abs(scrollY - scrollTargetY) / speed, MAX_TIME));
        let currentTime = 0;
        scrollTargetY = scrollTargetY || DEFUALT_SCROLLY;
        speed = speed || DEFAULT_SPEED;

        // add animation loop
        function update() {
            currentTime += 1 / 60; // requestAnimationFrame runs 60 FPS

            // easing equations from https://github.com/danro/easing-js/blob/master/easing.js "easeOutSine"
            const progress = currentTime / totalTime;
            const easeProgress = Math.sin(progress * (Math.PI / 2));

            if (progress < 1) {
                window.requestAnimationFrame(update);
                window.scrollTo(0, scrollY + ((scrollTargetY - scrollY) * easeProgress));
            } else {
                window.scrollTo(0, scrollTargetY);
            }
        }

        update();
    }
};