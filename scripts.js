// ================================
// 全域變數設定及初始化函數
// ================================
(() => {
    let materialsData = []; // 用於存儲從 materials.json 加載的材質資料
    let materialAreaSums = {}; // 用於追踪每個材質的面積總和

    document.addEventListener('DOMContentLoaded', () => {
        fetchMaterialsData(); // 從 materials.json 加載材質資料
        initializeEventHandlers(); // 初始化事件處理程序
        initializeSizeModal(); // 初始化彈出視窗相關功能
    });

    // ================================
    // 初始化所有事件處理程序
    // ================================
    const initializeEventHandlers = () => {
        document.querySelector('.btn-add-dimension').addEventListener('click', () => manageDimensionGroups('add'));
        document.getElementById('calculatorForm').addEventListener('submit', handleFormSubmission);
        document.querySelector('button[type="reset"]').addEventListener('click', resetForm);
        document.getElementById('dimensionContainer').addEventListener('click', handleDimensionContainerClick);
    };

    // ================================
    // 從 materials.json 加載材質資料
    // ================================
    const fetchMaterialsData = () => {
        fetch('materials.json')
            .then(response => response.json())
            .then(data => {
                materialsData = data; // 初始化材質資料
                initializeMaterialSelect(data); // 初始化材質選擇器
            })
            .catch(error => console.error('無法加載材質資料:', error));
    };

    // ================================
    // 材質選擇器的初始化及功能
    // ================================
    const initializeMaterialSelect = (materials) => {
        const materialSelect = document.getElementById('material');
        materialSelect.innerHTML = ''; // 清空選項
        materialSelect.append(new Option("請選擇材質", "", true, true));

        materials.forEach(({ name }) => materialSelect.add(new Option(name, name)));

        new TomSelect("#material", {
            maxItems: 1,
            create: false,
            sortField: { field: "text", direction: "asc" },
            placeholder: "請選擇材質",
            noResultsText: '無搜尋結果',
            plugins: ['clear_button'],
            render: {
                option: (data, escape) => `<div class="custom-option">${escape(data.text)}</div>`
            }
        });
    };

    // ================================
    // 管理尺寸組的增刪功能
    // ================================
    const manageDimensionGroups = (action, element) => {
        const dimensionContainer = document.getElementById('dimensionContainer');

        if (action === 'add') {
            const newDimensionGroup = createDimensionGroup();
            dimensionContainer.appendChild(newDimensionGroup);
        } else if (action === 'remove' && dimensionContainer.children.length > 1) {
            element.closest('.dimension-group').remove();
        }

        updateGroupSelection();
        updateDimensionNumbers();
    };

    const handleDimensionContainerClick = (event) => {
        const removeBtn = event.target.closest('.btn-remove-dimension');
        if (removeBtn) {
            manageDimensionGroups('remove', removeBtn);
        }
    };

    const createDimensionGroup = (length = '', width = '') => {
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
    };

    // ================================
    // 表單提交和重置功能
    // ================================
    const handleFormSubmission = (event) => {
        event.preventDefault();
    
        const material = document.getElementById('material').value;
        const materialPrice = getMaterialPrice(material);
        const materialDiscountPrice = getMaterialPrice(material, true);
        const dimensions = getDimensions();
        const isTrimChecked = document.getElementById('trimCheckbox').checked;
    
        if (!material || materialPrice === 0 || !validateDimensions(dimensions)) {
            alert('請填寫所有欄位或檢查材質價格！');
            return;
        }
    
        dimensions.forEach(dimension => {
            updateMaterialAreaSums(material, dimension.length, dimension.width, dimension.quantity, isTrimChecked);
        });
    
        dimensions.forEach(dimension => {
            const totalAmount = isTrimChecked
                ? calculateAmountWithTrim(dimension.length, dimension.width, dimension.quantity, material, materialPrice, materialDiscountPrice)
                : calculateAmount(dimension.length, dimension.width, dimension.quantity, material, materialPrice, materialDiscountPrice);
    
            addRowToTable(material, dimension, totalAmount, isTrimChecked);
        });
    
        updateAllRowsInTable();
        resetForm();
    };

    const resetForm = () => {
        const calculatorForm = document.getElementById('calculatorForm');
        calculatorForm.reset();
        document.getElementById('material').tomselect.clear();

        const dimensionContainer = document.getElementById('dimensionContainer');
        while (dimensionContainer.children.length > 1) {
            dimensionContainer.lastElementChild.remove();
        }

        updateGroupSelection();
        updateDimensionNumbers();
    };

    // ================================
    // 輔助函數：計算材質面積總和
    // ================================
    const updateMaterialAreaSums = (material, length, width, quantity, isTrimChecked) => {
        const area = isTrimChecked ? (length * width * quantity) / 900 : Math.ceil((length * width) / 900) * quantity;
        materialAreaSums[material] = (materialAreaSums[material] || 0) + area;
    };

    const resetMaterialAreaSums = () => {
        materialAreaSums = {};
    };

    // ================================
    // 獲取材質的價格和優惠價格
    // ================================
    const getMaterialPrice = (materialName, isDiscount = false) => {
        const material = materialsData.find(mat => mat.name === materialName);
        return material ? (isDiscount ? material.discount_price : material.price) : 0;
    };

    // ================================
    // 計算和表格操作的輔助函數
    // ================================
    const calculateAmount = (length, width, quantity, material, pricePerUnit, discountPricePerUnit) => {
        const roundedAreaUnits = Math.ceil((length * width) / 900);
        const area = roundedAreaUnits * quantity;
        const unitPrice = materialAreaSums[material] >= 100 ? discountPricePerUnit : pricePerUnit;
        return (unitPrice * area).toFixed(0);
    };

    const calculateAmountWithTrim = (length, width, quantity, material, pricePerUnit, discountPricePerUnit) => {
        const area = (length * width * quantity);
        const unitPrice = (materialAreaSums[material] >= 100 ? discountPricePerUnit : pricePerUnit) + 20;
        return (unitPrice * Math.ceil(area / 900)).toFixed(0);
    };

    const getDimensions = () => Array.from(document.querySelectorAll('.dimension-group')).map(group => ({
        length: parseFloat(group.querySelector('.length-input').value),
        width: parseFloat(group.querySelector('.width-input').value),
        quantity: parseInt(group.querySelector('.quantity-input').value)
    }));

    const validateDimensions = (dimensions) => dimensions.every(({ length, width, quantity }) => length && width && quantity);

    // ================================
    // 表格操作函數
    // ================================
    const addRowToTable = (material, dimension, totalAmount, isTrimChecked) => {
        const tableBody = document.getElementById('resultTable').querySelector('tbody');
        const newRow = document.createElement('tr');
        const unitPrice = calculateUnitPrice(totalAmount, dimension.quantity);
        const materialName = isTrimChecked ? material + "+裁小模" : material;
    
        newRow.innerHTML = `
            <td>${materialName}</td>
            <td>${dimension.length}x${dimension.width}cm</td>
            <td>${dimension.quantity}</td>
            <td class="unit-price">${unitPrice}</td>
            <td class="total-amount">${totalAmount} <i class="fa fa-info-circle text-danger ms-2 tooltip-icon" style="cursor: pointer;" data-bs-toggle="tooltip" title="未達基本價$200"></i></td>
            <td><button type="button" class="btn btn-danger btn-sm delete-row"><i class="fa fa-trash"></i></button></td>
        `;
    
        newRow.querySelector('.delete-row').addEventListener('click', () => {
            const area = dimension.length * dimension.width * dimension.quantity;
            materialAreaSums[material] -= Math.ceil(area / 900);
            newRow.remove();
            updateAllRowsInTable();
        });
    
        tableBody.appendChild(newRow);
        initializeTooltips();
    };

    const calculateUnitPrice = (totalAmount, quantity) => (quantity === 0) ? 0 : (totalAmount / quantity).toFixed(1);

    const updateAllRowsInTable = () => {
        const rows = document.querySelectorAll('#resultTable tbody tr');
        const materialTotals = {};

        rows.forEach(row => {
            const material = row.children[0].textContent.replace("+裁小模", "");
            const dimensions = row.children[1].textContent.split('x').map(parseFloat);
            const quantity = parseInt(row.children[2].textContent);
            const isTrimChecked = row.children[0].textContent.includes("+裁小模");

            const materialPrice = getMaterialPrice(material);
            const materialDiscountPrice = getMaterialPrice(material, true);

            let totalAmount;
            if (isTrimChecked) {
                totalAmount = calculateAmountWithTrim(dimensions[0], dimensions[1], quantity, material, materialPrice, materialDiscountPrice);
            } else {
                totalAmount = calculateAmount(dimensions[0], dimensions[1], quantity, material, materialPrice, materialDiscountPrice);
            }

            const unitPrice = calculateUnitPrice(totalAmount, quantity);

            row.children[3].textContent = unitPrice;
            row.children[4].firstChild.textContent = totalAmount + ' ';

            materialTotals[material] = (materialTotals[material] || 0) + parseFloat(totalAmount);
        });

        rows.forEach(row => {
            const material = row.children[0].textContent.replace("+裁小模", "");
            const totalCell = row.children[4];
            const tooltipIcon = totalCell.querySelector('.tooltip-icon');

            if (materialTotals[material] < 200) {
                totalCell.style.color = 'red';
                tooltipIcon.style.display = 'inline';
            } else {
                totalCell.style.color = '';
                tooltipIcon.style.display = 'none';
            }
        });

        initializeTooltips();
    };

    // ================================
    // 更新和輔助功能
    // ================================
    const updateGroupSelection = () => {
        const selectGroup = document.getElementById('selectGroup');
        selectGroup.innerHTML = ''; // 清空現有選項
        document.querySelectorAll('.dimension-group').forEach((group, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `尺寸組 ${index + 1}`;
            selectGroup.appendChild(option);
        });
    };

    const updateDimensionNumbers = () => {
        document.querySelectorAll('.dimension-group').forEach((group, index) => {
            const numberSpan = group.querySelector('.dimension-number');
            if (numberSpan) {
                numberSpan.textContent = index + 1;
            }
        });
    };

    // ================================
    // Tooltip 初始化函數
    // ================================
    const initializeTooltips = () => {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            const tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
                customClass: 'custom-tooltip',
                trigger: 'manual'
            });

            tooltipTriggerEl.addEventListener('mouseenter', () => {
                hideAllTooltips();
                tooltip.show();
            });

            tooltipTriggerEl.addEventListener('mouseleave', () => {
                tooltip.hide();
            });
        });

        document.addEventListener('click', (event) => {
            if (!event.target.closest('[data-bs-toggle="tooltip"]')) {
                hideAllTooltips();
            }
        });
    };

    // 隱藏所有 Tooltip
    const hideAllTooltips = () => {
        const allTooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        allTooltips.forEach(tooltipEl => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipEl);
            if (tooltipInstance) {
                tooltipInstance.hide();
            }
        });
    };
})();
