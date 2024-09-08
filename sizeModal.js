// ================================
// 初始化彈出視窗和事件監聽器
// ================================

document.addEventListener('DOMContentLoaded', () => {
    initializeSizeModal();
    initializeCollapsibleSections();
    initializeRadioButtonListeners();
    
    // 設定確認按鈕的點擊事件處理
    document.getElementById('confirmButton').addEventListener('click', handleConfirmAction);
});

let selectedSizeButton = null; // 儲存選擇的尺寸按鈕

// ================================
// 可折疊區塊的初始化及功能
// ================================

function initializeCollapsibleSections() {
    const titles = document.querySelectorAll('.collapsible-title');

    titles.forEach(title => {
        const target = document.querySelector(title.getAttribute('data-bs-target'));
        const icon = title.querySelector('.toggle-icon');

        // 設定每個標題的點擊事件
        title.addEventListener('click', function () {
            toggleCollapsibleSection(title, target, icon, titles);
        });

        // 初始設定：根據默認展開狀態設置箭頭方向
        target.addEventListener('hidden.bs.collapse', () => updateIcon(icon, 'right'));
        target.addEventListener('shown.bs.collapse', () => updateIcon(icon, 'down'));
    });
}

function toggleCollapsibleSection(currentTitle, currentTarget, currentIcon, allTitles) {
    if (!currentTarget.classList.contains('show')) {
        allTitles.forEach(otherTitle => {
            if (otherTitle !== currentTitle) {
                const otherTarget = document.querySelector(otherTitle.getAttribute('data-bs-target'));
                const otherIcon = otherTitle.querySelector('.toggle-icon');

                if (otherTarget.classList.contains('show')) {
                    bootstrap.Collapse.getInstance(otherTarget).hide(); // 收合其他區塊
                    updateIcon(otherIcon, 'right'); // 更新箭頭方向
                }
            }
        });

        // 展開當前區塊並更改箭頭方向
        bootstrap.Collapse.getOrCreateInstance(currentTarget).show();
        updateIcon(currentIcon, 'down');
    } else {
        // 收合當前區塊並恢復箭頭方向
        bootstrap.Collapse.getInstance(currentTarget).hide();
        updateIcon(currentIcon, 'right');
    }
}

function updateIcon(icon, direction) {
    icon.classList.remove('down', 'right');
    icon.classList.add(direction);
}

// ================================
// 尺寸選擇彈出視窗的初始化及功能
// ================================

function initializeSizeModal() {
    // 當彈出視窗顯示時更新下拉選單
    document.getElementById('sizeModal').addEventListener('shown.bs.modal', updateGroupSelection);

    // 點擊常用尺寸按鈕時選中按鈕並存儲尺寸
    document.querySelectorAll('#sizeModal .size-option').forEach(button => {
        button.addEventListener('click', function () {
            selectSizeOptionButton(this);
        });
    });
}

function selectSizeOptionButton(button) {
    if (selectedSizeButton) {
        selectedSizeButton.classList.remove('active'); // 移除之前選中的按鈕樣式
    }
    button.classList.add('active'); // 添加選中樣式
    selectedSizeButton = button; // 設置當前按鈕為選中狀態
}

// ================================
// 處理確認按鈕的功能
// ================================

function handleConfirmAction() {
    if (selectedSizeButton) {
        const length = selectedSizeButton.getAttribute('data-length');
        const width = selectedSizeButton.getAttribute('data-width');
        const fillOption = document.querySelector('#sizeModal input[name="sizeOption"]:checked').value;
        
        fillSelectedOption(length, width, fillOption);

        // 清除選中的按鈕樣式
        selectedSizeButton.classList.remove('active');
        selectedSizeButton = null; // 重置選中狀態

        // 關閉彈出視窗
        bootstrap.Modal.getInstance(document.getElementById('sizeModal')).hide();
    } else {
        alert('請先選擇一個常用尺寸！'); // 如果未選擇尺寸，顯示提示訊息
    }
}

function fillSelectedOption(length, width, fillOption) {
    if (fillOption === 'existing') {
        const selectedGroupIndex = document.getElementById('selectGroup').value;
        const selectedGroup = document.querySelectorAll('.dimension-group')[selectedGroupIndex];
        if (selectedGroup) {
            selectedGroup.querySelector('.length-input').value = length;
            selectedGroup.querySelector('.width-input').value = width;
        }
    } else {
        // 新增一組尺寸並填入
        const dimensionContainer = document.getElementById('dimensionContainer');
        const newDimensionGroup = createDimensionGroup(length, width);
        dimensionContainer.appendChild(newDimensionGroup);
        updateGroupSelection(); // 更新選擇尺寸組的下拉選單
        updateDimensionNumbers(); // 更新尺寸組編號
    }
}

// ================================
// 更新選擇尺寸組的下拉選單
// ================================

function updateGroupSelection() {
    const selectGroup = document.getElementById('selectGroup');
    selectGroup.innerHTML = ''; // 清空現有選項
    const groups = document.querySelectorAll('.dimension-group');
    groups.forEach((group, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `尺寸組 ${index + 1}`;
        selectGroup.appendChild(option);
    });
}

// ================================
// 初始化 Radio 按鈕的監聽器
// ================================

function initializeRadioButtonListeners() {
    const existingRadio = document.getElementById('fillExisting');
    const addNewRadio = document.getElementById('addNew');
    const selectGroup = document.getElementById('selectGroup');

    existingRadio.addEventListener('change', () => toggleSelectGroup(existingRadio, selectGroup));
    addNewRadio.addEventListener('change', () => toggleSelectGroup(addNewRadio, selectGroup));

    // 初始狀態檢查
    toggleSelectGroup(existingRadio.checked ? existingRadio : addNewRadio, selectGroup);
}

function toggleSelectGroup(radioButton, selectGroup) {
    selectGroup.disabled = radioButton === document.getElementById('addNew'); // 根據選中的 RadioButton 禁用或啟用下拉式選單
}
