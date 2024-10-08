// 立即執行函數，避免全局變量污染
(() => {
    // ===== 全局變量 =====
    let materialsData = []; // 存儲材質資料
    let materialAreaSums = {}; // 追踪每個材質的面積總和

    // 初始化應用
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            await initializeApp();
        } catch (error) {
            console.error('初始化應用程序時發生錯誤:', error);
        }
    });

    // ===== 初始化模組 =====
    async function initializeApp() {
        try {
            const materials = await fetchMaterialsData();
            if (materials && materials.length > 0) {
                materialsData = materials;
                await MaterialSelect.init(materials);
            } else {
                console.warn('未能獲取材料數據');
            }
            
            initializeEventHandlers();
            initializeSizeModal();
            initializeTooltips();
            updateTotals();
            initializeLineButtons();
        } catch (error) {
            console.error('初始化過程中發生錯誤:', error);
        }
    }

    function initializeEventHandlers() {
        document.querySelector('.btn-add-dimension').addEventListener('click', handleAddDimension);
        document.getElementById('calculatorForm').addEventListener('submit', handleFormSubmission);
        document.querySelector('button[type="reset"]').addEventListener('click', resetForm);
        document.getElementById('dimensionContainer').addEventListener('click', handleDimensionContainerClick);
        document.getElementById('clearAllBtn').addEventListener('click', handleClearAll);
        const remarksSubmitBtn = document.getElementById('remarksSubmitBtn');
        if (remarksSubmitBtn) {
            remarksSubmitBtn.addEventListener('click', handleRemarksSubmission);
        }
        const remarksResetBtn = document.getElementById('remarksResetBtn');
        if (remarksResetBtn) {
            remarksResetBtn.addEventListener('click', resetRemarks);
        }
        const deliveryOptions = document.querySelectorAll('input[name="deliveryOption"]');
        deliveryOptions.forEach(option => {
            option.addEventListener('change', toggleShippingDetails);
        });
        
        // 為快遞取件選項添加 tooltip
        const courierOption = document.getElementById('courier');
        if (courierOption) {
            const tooltipIcon = courierOption.nextElementSibling.querySelector('.fa-info-circle');
            if (tooltipIcon) {
                tooltipIcon.setAttribute('data-bs-toggle', 'tooltip');
                tooltipIcon.setAttribute('data-bs-placement', 'top');
                tooltipIcon.setAttribute('title', '請由客戶自行叫車');
            }
        }

        const pickupDateOption = document.getElementById('pickupDateOption');
        const pickupDateInputContainer = document.getElementById('pickupDateInputContainer');

        if (pickupDateOption && pickupDateInputContainer) {
            pickupDateOption.addEventListener('change', function () {
                pickupDateInputContainer.style.display = this.value === 'specified' ? 'block' : 'none';
                if (this.value !== 'specified') {
                    document.getElementById('pickupDate').value = '';
                }
            });
        }
    }

    // ===== 材質資料載入模組 =====
    function fetchMaterialsData() {
        return fetch('materials.json')
            .then(response => response.json())
            .then(data => {
                materialsData = data;
                return data;
            })
            .catch(error => {
                console.error('無法加載材質資料:', error);
                return [];
            });
    }

    // ===== 材質選擇模組 =====
    const MaterialSelect = (function () {
        const DELIMITER = '+';
        let dropdownVisible = false;
        let selectedIndex = -1;
    
        async function init(materials) {
            try {
            const wrapper = document.createElement('div');
            wrapper.className = 'material-select-wrapper';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'material-select-input form-control';
            input.placeholder = '請選擇或搜索材質';
            
            const dropdown = document.createElement('ul');
            dropdown.className = 'material-select-dropdown';
            
            wrapper.appendChild(input);
            wrapper.appendChild(dropdown);
            
            const container = document.getElementById('materialSelectContainer');
            container.innerHTML = ''; // 清空容器
            container.appendChild(wrapper);
    
            input.addEventListener('input', () => updateDropdown(materials, input.value));
            input.addEventListener('focus', () => showDropdown(materials, input.value));
            input.addEventListener('blur', () => setTimeout(hideDropdown, 200));
            input.addEventListener('keydown', (e) => handleKeyDown(e, materials));
    
            document.addEventListener('click', (e) => {
                if (!wrapper.contains(e.target)) hideDropdown();
            });
    
            updateDropdown(materials, '');
            await new Promise(resolve => {
                requestAnimationFrame(() => {
                    const input = document.querySelector('.material-select-input');
                    if (input && window.getComputedStyle(input).width !== '100%') {
                        console.warn('材質選擇器樣式可能未正確應用');
                    }
                    resolve();
                });
            });
        } catch (error) {
            console.error('初始化材質選擇器時發生錯誤:', error);
        }
        }
    
        function updateDropdown(materials, query) {
            const dropdown = document.querySelector('.material-select-dropdown');
            dropdown.innerHTML = '';
            const filteredMaterials = materials.filter(m => customScore(query, m) > 0);
    
            filteredMaterials.forEach((material, index) => {
                const li = document.createElement('li');
                li.textContent = material.name;
                li.setAttribute('data-index', index);
                li.addEventListener('click', () => selectMaterial(material.name));
                li.addEventListener('mouseover', () => {
                    selectedIndex = index;
                    updateSelectedItem();
                });
                dropdown.appendChild(li);
            });
    
            if (filteredMaterials.length > 0) {
                showDropdown();
            } else {
                hideDropdown();
            }
            
            selectedIndex = -1;
            updateSelectedItem();
        }
    
        function showDropdown() {
            const dropdown = document.querySelector('.material-select-dropdown');
            dropdown.style.display = 'block';
            dropdownVisible = true;
        }
    
        function hideDropdown() {
            const dropdown = document.querySelector('.material-select-dropdown');
            dropdown.style.display = 'none';
            dropdownVisible = false;
        }
    
        function selectMaterial(materialName) {
            const input = document.querySelector('.material-select-input');
            input.value = materialName;
            hideDropdown();
        }
    
        function handleKeyDown(event, materials) {
            const dropdown = document.querySelector('.material-select-dropdown');
            const items = dropdown.querySelectorAll('li');
    
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    selectedIndex = (selectedIndex + 1) % items.length;
                    updateSelectedItem();
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    selectedIndex = (selectedIndex - 1 + items.length) % items.length;
                    updateSelectedItem();
                    break;
                case 'Enter':
                    if (selectedIndex !== -1) {
                        selectMaterial(items[selectedIndex].textContent);
                    }
                    break;
                case '+':
                    if (!event.target.value.endsWith('+')) {
                        event.preventDefault();
                        event.target.value += '+';
                        updateDropdown(materials, event.target.value);
                    }
                    break;
            }
        }
    
        function updateSelectedItem() {
            const items = document.querySelectorAll('.material-select-dropdown li');
            items.forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('selected');
                    item.scrollIntoView({ block: 'nearest' });
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    
        function customScore(search, item) {
            if (!search) return 1;
            search = search.toLowerCase();
            const itemText = item.name.toLowerCase();
    
            if (itemText === search) return 4;
            if (itemText.startsWith(search)) return 3;
            if (itemText.includes(search)) return 2;
    
            if (search.includes(DELIMITER)) {
                const searchParts = search.split(DELIMITER);
                const itemParts = itemText.split(DELIMITER);
    
                for (let i = 0; i < searchParts.length; i++) {
                    if (!itemParts[i] || !itemParts[i].startsWith(searchParts[i])) {
                        return 0;
                    }
                }
                return 3;
            }
    
            return 0;
        }
    
        return { init };
    })();
    
    // ===== 尺寸組管理模組 =====
    function handleAddDimension() {
        manageDimensionGroups('add');
    }

    function handleDimensionContainerClick(event) {
        const removeBtn = event.target.closest('.btn-remove-dimension');
        if (removeBtn) manageDimensionGroups('remove', removeBtn);
    }

    function manageDimensionGroups(action, element) {
        const dimensionContainer = document.getElementById('dimensionContainer');
        if (action === 'add') {
            const newGroup = createDimensionGroup();
            dimensionContainer.appendChild(newGroup);
        } else if (action === 'remove' && dimensionContainer.children.length > 1) {
            element.closest('.dimension-group').remove();
        }
        updateGroupSelection();
        updateDimensionNumbers();
    }

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

    function updateGroupSelection() {
        const selectGroup = document.getElementById('selectGroup');
        selectGroup.innerHTML = '';
        document.querySelectorAll('.dimension-group').forEach((_, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `尺寸組 ${index + 1}`;
            selectGroup.appendChild(option);
        });
    }

    function updateDimensionNumbers() {
        document.querySelectorAll('.dimension-group').forEach((group, index) => {
            const numberSpan = group.querySelector('.dimension-number');
            if (numberSpan) {
                numberSpan.textContent = index + 1;
            }
        });
    }

    // ===== 表單提交模組 =====
    function handleFormSubmission(event) {
        event.preventDefault();
    
        const material = document.querySelector('.material-select-input').value;
    
        if (!material) {
            alert('請選擇有效的材質！');
            return;
        }
    
        let materialPrice = getMaterialPrice(material);
        let materialDiscountPrice = getMaterialPrice(material, true);
    
        if (materialPrice === 0) {
            alert(`錯誤：無效的材質 "${material}"。請選擇下拉式選單中的材質。`);
            return;
        }
    
        const dimensions = getDimensions();
        if (!validateDimensions(dimensions)) {
            alert('請填寫有效的尺寸和數量！');
            return;
        }
    
        if (dimensions.length === 0) {
            alert('請至少添加一組尺寸和數量！');
            return;
        }
    
        const isTrimChecked = document.getElementById('trimCheckbox').checked;
        const isSpecialCutting = material.includes("裁小模") || material.includes("輪廓裁型") || material.includes("合成板裁型");
    
        const tableBody = document.getElementById('resultTable').querySelector('tbody');
        const initialRowCount = tableBody.children.length;
    
        dimensions.forEach(dimension => {
            updateMaterialAreaSums(material, dimension.length, dimension.width, dimension.quantity, isSpecialCutting || isTrimChecked);
            const totalAmount = calculateAmount(dimension.length, dimension.width, dimension.quantity, material, materialPrice, materialDiscountPrice, isTrimChecked);
            addRowToTable(material, dimension, totalAmount, isTrimChecked);
        });
    
        updateAllRowsInTable();
        resetForm();
    
        if (tableBody.children.length > initialRowCount) {
            const lastAddedRow = tableBody.children[tableBody.children.length - 1];
            setTimeout(() => {
                scrollToElement(lastAddedRow);
            }, 100);
        }
    }

    function resetForm() {
        document.getElementById('calculatorForm').reset();
        document.querySelector('.material-select-input').value = '';
        const dimensionContainer = document.getElementById('dimensionContainer');
        while (dimensionContainer.children.length > 1) {
            dimensionContainer.lastElementChild.remove();
        }
        updateGroupSelection();
        updateDimensionNumbers();
    }

    // ===== 材質價格計算模組 =====
    function getBaseMaterialName(material) {
        return material.replace(/\+(裁小模|輪廓裁型|合成板裁型)$/, '');
    }

    function updateMaterialAreaSums(material, length, width, quantity, isSpecialCalculation) {
        const baseMaterial = getBaseMaterialName(material);
        const area = calculateArea(length, width, quantity, isSpecialCalculation);
        materialAreaSums[baseMaterial] = (materialAreaSums[baseMaterial] || 0) + area;
    }

    function calculateArea(length, width, quantity, isSpecialCalculation) {
        return isSpecialCalculation ? Math.ceil((length * width * quantity) / 900) : Math.ceil((length * width) / 900) * quantity;
    }

    function getMaterialPrice(materialName, isDiscount = false) {
        const material = materialsData.find(mat => mat.name === materialName);
        if (!material) {
            return 0; // 如果材質不存在，返回 0
        }
        return isDiscount ? material.discount_price : material.price;
    }

    function calculateAmount(length, width, quantity, material, pricePerUnit, discountPricePerUnit, isTrimChecked) {
        const baseMaterial = getBaseMaterialName(material);
        const isSpecialCutting = material.includes("裁小模") || material.includes("輪廓裁型") || material.includes("合成板裁型");
        const area = calculateArea(length, width, quantity, isSpecialCutting || isTrimChecked);
        const isDiscounted = materialAreaSums[baseMaterial] >= 100;
        const unitPrice = isDiscounted ? discountPricePerUnit : pricePerUnit;
        let additionalFee = 0;
        
        if (isTrimChecked && !material.includes("裁小模")) {
            additionalFee = isDiscounted ? 18 : 20;
        }
        
        return ((unitPrice + additionalFee) * area).toFixed(0);
    }

    function getDimensions() {
        return Array.from(document.querySelectorAll('.dimension-group')).map(group => ({
            length: parseFloat(group.querySelector('.length-input').value),
            width: parseFloat(group.querySelector('.width-input').value),
            quantity: parseInt(group.querySelector('.quantity-input').value)
        }));
    }

    function validateDimensions(dimensions) {
        return dimensions.every(({ length, width, quantity }) =>
            !isNaN(length) && length > 0 &&
            !isNaN(width) && width > 0 &&
            !isNaN(quantity) && quantity > 0
        );
    }

    // ===== 表格操作模組 =====
    function addRowToTable(material, dimension, totalAmount, isTrimChecked) {
        const tableBody = document.getElementById('resultTable').querySelector('tbody');
        const newRow = document.createElement('tr');
        const unitPrice = calculateUnitPrice(totalAmount, dimension.quantity);
        let materialName = material + (isTrimChecked && !material.includes("裁小模") ? "+裁小模" : "");

        const baseMaterial = getBaseMaterialName(material);
        const isDiscounted = materialAreaSums[baseMaterial] >= 100;
        const amountColor = isDiscounted ? 'green' : '';

        newRow.innerHTML = `
            <td data-label="材質">${materialName}</td>
            <td data-label="尺寸">${dimension.length}x${dimension.width}cm</td>
            <td data-label="數量">${dimension.quantity}</td>
            <td data-label="單價" class="unit-price">${unitPrice}</td>
            <td data-label="金額" class="total-amount" style="color: ${amountColor};">
                ${totalAmount}
                <i class="fa fa-info-circle text-danger ms-2 tooltip-icon" 
                   style="cursor: pointer;" 
                   data-bs-toggle="tooltip" 
                   title="未達基本價$200"></i>
            </td>
            <td data-label="">
                <button type="button" class="btn btn-danger btn-sm delete-row">
                    <i class="fa fa-trash"></i>
                </button>
            </td>
        `;

        const deleteButton = newRow.querySelector('.delete-row');
        deleteButton.addEventListener('click', () => {
            const isSpecialCutting = material.includes("裁小模") || material.includes("輪廓裁型") || material.includes("合成板裁型") || isTrimChecked;
            const area = calculateArea(dimension.length, dimension.width, dimension.quantity, isSpecialCutting);
            materialAreaSums[baseMaterial] -= area;
            newRow.remove();
            updateAllRowsInTable();
            updateTotals();
        });

        newRow.style.opacity = '0';
        tableBody.appendChild(newRow);

        setTimeout(() => {
            scrollToElement(newRow);
            setTimeout(() => {
                newRow.style.transition = 'opacity 0.5s ease-out';
                newRow.style.opacity = '1';
            }, 300);
        }, 100);

        initializeTooltips();
        updateTotals();
    }

    function calculateUnitPrice(totalAmount, quantity) {
        return (quantity === 0) ? 0 : (totalAmount / quantity).toFixed(1);
    }

    function scrollToElement(element) {
        const offset = 60;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }

    function updateAllRowsInTable() {
        const rows = document.querySelectorAll('#resultTable tbody tr');
        const materialTotals = {};

        rows.forEach(row => {
            let material = row.children[0].textContent;
            const hasTrimMode = material.includes("+裁小模");
            material = material.replace("+裁小模", "");
            const baseMaterial = getBaseMaterialName(material);

            const [length, width] = row.children[1].textContent.split('x').map(parseFloat);
            const quantity = parseInt(row.children[2].textContent);
            const isSpecialCalculation = hasTrimMode || material.includes("裁小模") || material.includes("輪廓裁型") || material.includes("合成板裁型");

            const materialPrice = getMaterialPrice(material);
            const materialDiscountPrice = getMaterialPrice(material, true);
            const isDiscounted = materialAreaSums[baseMaterial] >= 100;

            const totalAmount = calculateAmount(length, width, quantity, material, materialPrice, materialDiscountPrice, hasTrimMode);
            const unitPrice = calculateUnitPrice(totalAmount, quantity);

            row.children[3].textContent = unitPrice;
            const totalCell = row.children[4];
            totalCell.firstChild.textContent = totalAmount + ' ';
            totalCell.style.color = isDiscounted ? 'green' : '';

            materialTotals[baseMaterial] = (materialTotals[baseMaterial] || 0) + parseFloat(totalAmount);
        });

        updateRowColors(rows, materialTotals);
        initializeTooltips();
        updateTotals();
    }

    function updateRowColors(rows, materialTotals) {
        rows.forEach(row => {
            const material = row.children[0].textContent.replace("+裁小模", "");
            const baseMaterial = getBaseMaterialName(material);
            const totalCell = row.children[4];
            const tooltipIcon = totalCell.querySelector('.tooltip-icon');

            if (materialTotals[baseMaterial] < 200) {
                if (totalCell.style.color !== 'green') {
                    totalCell.style.color = 'red';
                }
                tooltipIcon.style.display = 'inline';
            } else {
                if (totalCell.style.color !== 'green') {
                    totalCell.style.color = '';
                }
                tooltipIcon.style.display = 'none';
            }
        });
    }

    // ===== 工具函數模組 =====
    function initializeTooltips() {
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            const tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
                customClass: 'custom-tooltip',
                trigger: 'hover focus',
                template: '<div class="tooltip custom-tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
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
    }
    
    function hideAllTooltips() {
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(tooltipEl => {
            const tooltipInstance = bootstrap.Tooltip.getInstance(tooltipEl);
            if (tooltipInstance) {
                tooltipInstance.hide();
            }
        });
    }    

    // ===== 總計更新模組 =====
    function updateTotals() {
        const rows = document.querySelectorAll('#resultTable tbody tr');
        let subtotal = 0;

        rows.forEach(row => {
            const amountCell = row.querySelector('td:nth-child(5)');
            const amount = parseFloat(amountCell.textContent.replace('$', ''));
            subtotal += amount;
        });

        const taxRate = 0.05; // 5% 稅率
        const tax = subtotal * taxRate;
        const total = subtotal + tax;

        document.getElementById('subtotal-amount').textContent = `$${subtotal.toFixed(0)}`;
        document.getElementById('tax-amount').textContent = `$${tax.toFixed(0)}`;
        document.getElementById('total-amount').textContent = `$${total.toFixed(0)}`;

        const totalSection = document.getElementById('totalSection');
    
        if (rows.length > 0) {
            totalSection.style.display = 'block';
            setTimeout(() => totalSection.classList.add('visible'), 50);
        } else {
            totalSection.classList.remove('visible');
            setTimeout(() => totalSection.style.display = 'none', 500);
        }
    }

    // ===== 尺寸選擇模態框模組 =====
    function initializeSizeModal() {
        const sizeModal = document.getElementById('sizeModal');
        if (sizeModal) {
            sizeModal.addEventListener('shown.bs.modal', updateGroupSelection);
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
            button.addEventListener('click', function () {
                selectSizeOptionButton(this);
                scrollToSizeOptions();
            });
        });
    }

    // ===== 備註和清除功能模組 =====
    function handleClearAll() {
        if (confirm('確定要清除所有項目嗎？此操作無法撤銷。')) {
            const tableBody = document.getElementById('resultTable').querySelector('tbody');
            tableBody.innerHTML = '';
            materialAreaSums = {}; // 重置材質面積總和
            updateTotals(); // 更新總計
        }
    }

    function handleRemarksSubmission(event) {
        event.preventDefault();
        try {
            const tableRows = document.querySelectorAll('#resultTable tbody tr');
            if (tableRows.length === 0) {
                alert('輸出清單目前沒有內容。請先添加項目到清單中。');
                return;
            }
    
            const outputContent = generateOutputContent();
            const remarksContent = generateRemarksContent();
            showOutputModal(outputContent, remarksContent);
        } catch (error) {
            console.error('處理備註提交時發生錯誤:', error);
            alert('處理備註時發生錯誤。請檢查控制台以獲取更多信息。');
        }
    }

    function showOutputModal(outputContent, remarksContent) {
        const combinedContent = outputContent + remarksContent;
        const modalContent = document.getElementById('modalContent');
        if (modalContent) {
            modalContent.textContent = combinedContent;
        } else {
            console.error('模態內容元素未找到');
        }
        
        const modal = new bootstrap.Modal(document.getElementById('outputModal'));
        modal.show();

        modal._element.addEventListener('shown.bs.modal', function () {
            const copyTextBtn = document.getElementById('copyTextBtn');
            const sendToLineBtn = document.getElementById('sendToLineBtn');
            if (copyTextBtn) {
                copyTextBtn.addEventListener('click', () => copyToClipboard(document.getElementById('modalContent').textContent));
            }
            if (sendToLineBtn) {
                sendToLineBtn.addEventListener('click', showLineOptions);
            }
        });
    }

    function generateOutputContent() {
        const rows = document.querySelectorAll('#resultTable tbody tr');
        let content = '';
        let subtotal = 0;
    
        rows.forEach((row, index) => {
            const material = row.cells[0].textContent;
            const size = row.cells[1].textContent;
            const quantity = row.cells[2].textContent;
            const unitPrice = row.cells[3].textContent;
            const amount = parseFloat(row.cells[4].textContent.replace('$', '').trim());
    
            content += `${index + 1}.\n`;
            content += `材質:${material}\n`;
            content += `尺寸:${size}\n`;
            content += `數量:${quantity}\n`;
            content += `單價:$${unitPrice}\n`;
            content += `金額:$${amount}\n\n`;
    
            subtotal += amount;
        });
    
        const taxRate = 0.05; // 5% 稅率
        const tax = subtotal * taxRate;
        const total = subtotal + tax;
        content += `------------------------\n`;
        content += `合計: $${subtotal.toFixed(0)}\n`;
        content += `稅金 (5%): $${tax.toFixed(0)}\n`;
        content += `總計: $${total.toFixed(0)}\n\n`;
    
        return content;
    }

    function generateRemarksContent() {
        const otherProcessing = document.getElementById('otherProcessing')?.value || '';
        const pickupDateOption = document.getElementById('pickupDateOption')?.value || '';
        const deliveryMethod = document.querySelector('input[name="deliveryOption"]:checked')?.value || '';
        const otherRemarks = document.getElementById('otherRemarks')?.value || '';

        let content = '※備註\n';
        if (otherProcessing) content += `其他加工: ${otherProcessing}\n`;
        
        // 處理取貨日期
        let pickupDateText = '';
        switch (pickupDateOption) {
            case 'unspecified':
                pickupDateText = '不指定';
                break;
            case 'urgent':
                pickupDateText = '急件當日取件';
                break;
            case 'specified':
                const specifiedDate = document.getElementById('pickupDate')?.value || '';
                pickupDateText = specifiedDate ? `指定日期: ${specifiedDate}` : '指定日期: 未選擇具體日期';
                break;
            default:
                pickupDateText = '未選擇';
        }
        content += `取貨日期: ${pickupDateText}\n`;

        if (deliveryMethod) content += `取貨方式: ${deliveryMethod}\n`;
        if (deliveryMethod === '郵寄/貨運') {
            const contactPerson = document.getElementById('contactPerson')?.value || '';
            const address = document.getElementById('address')?.value || '';
            const phone = document.getElementById('phone')?.value || '';
            if (contactPerson) content += `聯絡人: ${contactPerson}\n`;
            if (phone) content += `電話: ${phone}\n`;
            if (address) content += `地址: ${address}\n`;
        }
        if (otherRemarks) content += `其他: ${otherRemarks}\n`;

        return content.trim() === '※備註' ? '' : content;
    }

    function copyModalContent() {
        const modalContent = document.getElementById('modalContent');
        if (!modalContent) {
            console.error('模態內容元素未找到');
            alert('無法找到要複製的內容');
            return;
        }
        
        const textToCopy = modalContent.textContent;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    alert('文字已複製到剪貼板！');
                })
                .catch(err => {
                    console.error('複製失敗:', err);
                    alert('複製失敗，請手動複製文字。');
                });
        } else {
            fallbackCopyTextToClipboard(textToCopy);
        }
    }

    function fallbackCopyTextToClipboard(text) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
    
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
    
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('文字已複製到剪貼板！');
            } else {
                console.error('複製失敗（使用fallback方法）');
                alert('複製失敗，請手動複製文字。');
            }
        } catch (err) {
            console.error('複製過程中發生錯誤:', err);
            alert('複製失敗，請手動複製文字。');
        }
    
        document.body.removeChild(textArea);
    }
    
    function toggleShippingDetails() {
        const shippingDetails = document.getElementById('shippingDetails');
        const isShipping = document.getElementById('shipping').checked;
        shippingDetails.style.display = isShipping ? 'block' : 'none';
    }

    function resetRemarks() {
        document.getElementById('otherProcessing').value = '';
        document.getElementById('pickupDate').value = '';
        document.querySelectorAll('input[name="deliveryOption"]').forEach(radio => radio.checked = false);
        document.getElementById('otherRemarks').value = '';

        // 清空郵寄/貨運相關欄位
        document.getElementById('contactPerson').value = '';
        document.getElementById('address').value = '';
        document.getElementById('phone').value = '';

        // 隱藏郵寄/貨運相關欄位
        document.getElementById('shippingDetails').style.display = 'none';
    }

    function detectDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        if (/android/i.test(userAgent)) {
            return 'mobile';
        }
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            return 'mobile';
        }
        return 'desktop';
    }

    function initializeLineButtons() {
        const sendToLineBtn = document.getElementById('sendToLineBtn');
        if (sendToLineBtn) {
            sendToLineBtn.addEventListener('click', handleSendToLine);
        }
    }

    function handleSendToLine() {
        const deviceType = detectDevice();
        const modalContent = document.getElementById('modalContent').textContent;
        copyToClipboard(modalContent);
    
        if (deviceType === 'desktop') {
            sendToDesktopLine(modalContent);
        } else {
            sendToMobileLine(modalContent);
        }
    }
    function sendToDesktopLine(content) {
        const lineProtocolUrl = `line://msg/text/?${encodeURIComponent(content)}`;
        
        // 嘗試打開桌面版 LINE
        window.location.href = lineProtocolUrl;
        
        // 如果 5 秒後頁面還在，說明可能沒有安裝 LINE 或打開失敗
        setTimeout(() => {
            if (!document.hidden) {
                alert('無法打開桌面版 LINE。請確保您已安裝 LINE，或手動打開 LINE 並貼上已複製的內容。');
            }
        }, 5000);
    }

    function sendToMobileLine(content) {
        const lineOfficialAccountUrl = 'https://line.me/R/ti/p/@vcprint';
        const encodedMessage = encodeURIComponent(content);
        const url = `${lineOfficialAccountUrl}?${encodedMessage}`;
        
        window.location.href = url;
    }

    function showLineOptions() {
        try {
            const lineOptions = document.getElementById('lineOptions');
            if (!lineOptions) {
                console.error('無法找到 lineOptions 元素');
                return;
            }
            lineOptions.style.display = 'block';
            generateQRCode();
        } catch (error) {
            console.error('顯示 LINE 選項時發生錯誤:', error);
            alert('顯示選項時發生錯誤，請稍後再試。');
        }
    }

    function generateQRCode() {
        const modalContent = document.getElementById('modalContent').textContent;
        const lineOfficialAccountUrl = 'https://line.me/R/ti/p/@vcprint';
        const qrCodeContainer = document.getElementById('qrCode');
        qrCodeContainer.innerHTML = ''; // 清除之前的 QR Code
        
        new QRCode(qrCodeContainer, {
            text: `${lineOfficialAccountUrl}?${encodeURIComponent(modalContent)}`,
            width: 128,
            height: 128
        });
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                console.log('文字已成功複製到剪貼板');
            }).catch(err => {
                console.error('複製到剪貼板失敗:', err);
            });
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                console.log('文字已成功複製到剪貼板');
            } catch (err) {
                console.error('複製到剪貼板失敗:', err);
            }
            document.body.removeChild(textArea);
        }
    }

    // 公開需要在全局範圍內訪問的函數
    window.fillExistingGroup = function(length, width, selectedGroupIndex) {
        const selectedGroup = document.querySelectorAll('.dimension-group')[selectedGroupIndex];
        if (selectedGroup) {
            selectedGroup.querySelector('.length-input').value = length;
            selectedGroup.querySelector('.width-input').value = width;
        }
    };

    window.addNewGroup = function(length, width) {
        const dimensionContainer = document.getElementById('dimensionContainer');
        const newDimensionGroup = createDimensionGroup(length, width);
        dimensionContainer.appendChild(newDimensionGroup);
        updateGroupSelection();
        updateDimensionNumbers();
    }

})();