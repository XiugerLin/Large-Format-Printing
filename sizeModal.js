// ================================
// 全局變量
// ================================
let selectedSizeButton = null;

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

// ================================
// 初始化彈出視窗
// ================================
function initializeSizeModal() {
    // 當彈出視窗顯示時更新下拉選單
    document.getElementById('sizeModal').addEventListener('shown.bs.modal', updateGroupSelection);

    // 動態載入所有常用尺寸
    loadSizes('common-sizes.html');
}

// ================================
// 動態載入尺寸
// ================================
function loadSizes(url) {
    fetch(url)
        .then(response => response.text())
        .then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            // 載入海報尺寸
            const commonSizes = tempDiv.querySelector('#commonSizes');
            if (commonSizes) {
                document.getElementById('commonSizes').innerHTML = commonSizes.innerHTML;
            }
            
            // 載入布條尺寸
            const bannerSizes = tempDiv.querySelector('#bannerSizes');
            if (bannerSizes) {
                document.getElementById('bannerSizes').innerHTML = bannerSizes.innerHTML;
            }

            // 載入海報展架尺寸
            const standSizes = tempDiv.querySelector('#standSizes');
            if (standSizes) {
                document.getElementById('standSizes').innerHTML = standSizes.innerHTML;
            }
            
            // 重新綁定所有尺寸按鈕事件
            document.querySelectorAll('.size-option').forEach(button => {
                button.addEventListener('click', function () {
                    selectSizeOptionButton(this);
                });
            });
        })
        .catch(error => console.error('Error loading sizes:', error));
}

// ================================
// 初始化可折疊區塊
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

// ================================
// 切換可折疊區塊
// ================================
function toggleCollapsibleSection(currentTitle, currentTarget, currentIcon, allTitles) {
    if (!currentTarget.classList.contains('show')) {
        allTitles.forEach(otherTitle => {
            if (otherTitle !== currentTitle) {
                const otherTarget = document.querySelector(otherTitle.getAttribute('data-bs-target'));
                const otherIcon = otherTitle.querySelector('.toggle-icon');

                if (otherTarget.classList.contains('show')) {
                    bootstrap.Collapse.getInstance(otherTarget).hide();
                    updateIcon(otherIcon, 'right');
                }
            }
        });

        bootstrap.Collapse.getOrCreateInstance(currentTarget).show();
        updateIcon(currentIcon, 'down');
    } else {
        bootstrap.Collapse.getInstance(currentTarget).hide();
        updateIcon(currentIcon, 'right');
    }
}

// ================================
// 更新圖標
// ================================
function updateIcon(icon, direction) {
    icon.classList.remove('down', 'right');
    icon.classList.add(direction);
}

// ================================
// 選擇尺寸按鈕
// ================================
function selectSizeOptionButton(button) {
    if (selectedSizeButton) {
        selectedSizeButton.classList.remove('active');
    }
    button.classList.add('active');
    selectedSizeButton = button;
}

// ================================
// 處理確認按鈕動作
// ================================
function handleConfirmAction() {
    if (selectedSizeButton) {
        const length = selectedSizeButton.getAttribute('data-length');
        const width = selectedSizeButton.getAttribute('data-width');
        const fillOption = document.querySelector('#sizeModal input[name="sizeOption"]:checked').value;
        
        fillSelectedOption(length, width, fillOption);

        selectedSizeButton.classList.remove('active');
        selectedSizeButton = null;

        bootstrap.Modal.getInstance(document.getElementById('sizeModal')).hide();
    } else {
        alert('請先選擇一個常用尺寸！');
    }
}

// ================================
// 填入選擇的尺寸
// ================================
function fillSelectedOption(length, width, fillOption) {
    if (fillOption === 'existing') {
        const selectedGroupIndex = document.getElementById('selectGroup').value;
        const selectedGroup = document.querySelectorAll('.dimension-group')[selectedGroupIndex];
        if (selectedGroup) {
            selectedGroup.querySelector('.length-input').value = length;
            selectedGroup.querySelector('.width-input').value = width;
        }
    } else {
        const dimensionContainer = document.getElementById('dimensionContainer');
        const newDimensionGroup = createDimensionGroup(length, width);
        dimensionContainer.appendChild(newDimensionGroup);
        updateGroupSelection();
        updateDimensionNumbers();
    }
}

// ================================
// 創建新的尺寸組
// ================================
function createDimensionGroup(length = '', width = '') {
    const group = document.createElement('div');
    group.className = 'dimension-group mb-3 d-flex align-items-center';

    group.innerHTML = `
        <span class="dimension-number"></span>
        <input type="number" class="form-control length-input" placeholder="長度 (cm)" value="${length}" required step="0.1" min="0.1">
        <input type="number" class="form-control width-input" placeholder="寬度 (cm)" value="${width}" required step="0.1" min="0.1">
        <input type="number" class="form-control quantity-input" placeholder="數量" required min="1">
        <button type="button" class="btn btn-danger btn-remove-dimension"><i class="fa fa-trash"></i></button>
    `;

    return group;
}

// ================================
// 更新尺寸組選擇
// ================================
function updateGroupSelection() {
    const selectGroup = document.getElementById('selectGroup');
    selectGroup.innerHTML = '';
    document.querySelectorAll('.dimension-group').forEach((group, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `尺寸組 ${index + 1}`;
        selectGroup.appendChild(option);
    });
}

// ================================
// 更新尺寸組編號
// ================================
function updateDimensionNumbers() {
    document.querySelectorAll('.dimension-group').forEach((group, index) => {
        const numberSpan = group.querySelector('.dimension-number');
        if (numberSpan) {
            numberSpan.textContent = index + 1;
        }
    });
}

// ================================
// 初始化 Radio 按鈕監聽器
// ================================
function initializeRadioButtonListeners() {
    const existingRadio = document.getElementById('fillExisting');
    const addNewRadio = document.getElementById('addNew');
    const selectGroup = document.getElementById('selectGroup');

    existingRadio.addEventListener('change', () => toggleSelectGroup(existingRadio, selectGroup));
    addNewRadio.addEventListener('change', () => toggleSelectGroup(addNewRadio, selectGroup));

    toggleSelectGroup(existingRadio.checked ? existingRadio : addNewRadio, selectGroup);
}

// ================================
// 切換選擇尺寸組下拉選單
// ================================
function toggleSelectGroup(radioButton, selectGroup) {
    selectGroup.disabled = radioButton === document.getElementById('addNew');
}