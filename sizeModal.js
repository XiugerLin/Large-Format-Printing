// 主模塊
const SizeModal = (() => {
    let selectedSizeButton = null;

    function init() {
        document.addEventListener('DOMContentLoaded', () => {
            initializeSizeModal();
            initializeCollapsibleSections();
            initializeRadioButtonListeners();
            document.getElementById('confirmButton').addEventListener('click', handleConfirmAction);
        });
    }

    function initializeSizeModal() {
        const sizeModal = document.getElementById('sizeModal');
        if (sizeModal) {
            sizeModal.addEventListener('shown.bs.modal', () => {
                if (typeof window.updateGroupSelection === 'function') {
                    window.updateGroupSelection();
                }
                bindSizeOptionEvents();
            });
            loadSizes('common-sizes.html');
        }
    }

    function loadSizes(url) {
        fetch(url)
            .then(response => response.text())
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                
                updateSizeSection('commonSizes', tempDiv);
                updateSizeSection('bannerSizes', tempDiv);
                updateSizeSection('standSizes', tempDiv);
                
                bindSizeOptionEvents();
            })
            .catch(error => console.error('Error loading sizes:', error));
    }

    function updateSizeSection(id, tempDiv) {
        const section = tempDiv.querySelector(`#${id}`);
        if (section) {
            document.getElementById(id).innerHTML = section.innerHTML;
        }
    }

    function bindSizeOptionEvents() {
        document.querySelectorAll('.size-option').forEach(button => {
            button.addEventListener('click', function() {
                selectSizeOptionButton(this);
                scrollToSizeOptions();
            });
        });
    }

    function selectSizeOptionButton(button) {
        if (selectedSizeButton) {
            selectedSizeButton.classList.remove('active');
        }
        button.classList.add('active');
        selectedSizeButton = button;
    }

    function scrollToSizeOptions() {
        const sizeOptionsSection = document.querySelector('.mb-3:has(#selectGroup)');
        if (sizeOptionsSection) {
            sizeOptionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function initializeCollapsibleSections() {
        const titles = document.querySelectorAll('.collapsible-title');
        titles.forEach(title => {
            const target = document.querySelector(title.getAttribute('data-bs-target'));
            const icon = title.querySelector('.toggle-icon');
            title.addEventListener('click', () => toggleCollapsibleSection(title, target, icon, titles));
            setInitialCollapseState(target, icon);
        });
    }

    function setInitialCollapseState(target, icon) {
        if (target.classList.contains('show')) {
            updateIcon(icon, 'down');
        } else {
            updateIcon(icon, 'right');
        }
    }

    function toggleCollapsibleSection(currentTitle, currentTarget, currentIcon, allTitles) {
        const isCurrentlyCollapsed = !currentTarget.classList.contains('show');
        
        if (isCurrentlyCollapsed) {
            collapseOtherSections(currentTitle, allTitles);
            currentTarget.classList.add('show');
            updateIcon(currentIcon, 'down');
        } else {
            currentTarget.classList.remove('show');
            updateIcon(currentIcon, 'right');
        }
    }

    function collapseOtherSections(currentTitle, allTitles) {
        allTitles.forEach(otherTitle => {
            if (otherTitle !== currentTitle) {
                const otherTarget = document.querySelector(otherTitle.getAttribute('data-bs-target'));
                const otherIcon = otherTitle.querySelector('.toggle-icon');
                if (otherTarget.classList.contains('show')) {
                    otherTarget.classList.remove('show');
                    updateIcon(otherIcon, 'right');
                }
            }
        });
    }

    function updateIcon(icon, direction) {
        icon.classList.remove('down', 'right');
        icon.classList.add(direction);
    }

    function initializeRadioButtonListeners() {
        const existingRadio = document.getElementById('fillExisting');
        const addNewRadio = document.getElementById('addNew');
        const selectGroup = document.getElementById('selectGroup');

        existingRadio.addEventListener('change', () => toggleSelectGroup(existingRadio, selectGroup));
        addNewRadio.addEventListener('change', () => toggleSelectGroup(addNewRadio, selectGroup));

        toggleSelectGroup(existingRadio.checked ? existingRadio : addNewRadio, selectGroup);
    }

    function toggleSelectGroup(radioButton, selectGroup) {
        selectGroup.disabled = radioButton.id === 'addNew';
    }

    function handleConfirmAction() {
        if (!selectedSizeButton) {
            alert('請先選擇一個常用尺寸！');
            return;
        }

        const fillOption = getFillOption();
        if (!fillOption) {
            alert('請選擇填充選項（填充現有組或新增尺寸組）！');
            return;
        }

        const { length, width } = getSizeFromButton(selectedSizeButton);
        
        if (fillOption === 'existing') {
            const selectedGroupIndex = document.getElementById('selectGroup').value;
            if (selectedGroupIndex === "") {
                alert('請選擇要填充的尺寸組！');
                return;
            }
            if (typeof window.fillExistingGroup === 'function') {
                window.fillExistingGroup(length, width, selectedGroupIndex);
            }
        } else {
            if (typeof window.addNewGroup === 'function') {
                window.addNewGroup(length, width);
            }
        }

        resetAndCloseModal();
    }

    function getSizeFromButton(button) {
        return {
            length: button.getAttribute('data-length'),
            width: button.getAttribute('data-width')
        };
    }

    function getFillOption() {
        const checkedRadio = document.querySelector('input[name="sizeOption"]:checked');
        return checkedRadio ? checkedRadio.value : null;
    }

    function resetAndCloseModal() {
        if (selectedSizeButton) {
            selectedSizeButton.classList.remove('active');
            selectedSizeButton = null;
        }
        const modal = document.getElementById('sizeModal');
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }

    // 公開 API
    return {
        init: init
    };
})();

// 初始化 SizeModal
SizeModal.init();