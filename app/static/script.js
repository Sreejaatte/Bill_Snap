
document.addEventListener("DOMContentLoaded", () => {

    const fileInput = document.getElementById("file");
    const fileDetails = document.getElementById("fileDetails");

    const uploadForm = document.getElementById("uploadForm");
    const scanButton = document.getElementById("scanButton");

    const loading = document.getElementById("loading");
    const errorMessage = document.getElementById("errorMessage");

    const result = document.getElementById("result");
    const resultContent = document.getElementById("resultContent");

    const editForm = document.getElementById("editForm");
    const saveButton = document.getElementById("saveButton");
    const saveMessage = document.getElementById("saveMessage");

    const savedBills = document.getElementById("savedBills");
    const refreshBills = document.getElementById("refreshBills");

    let currentBill = null;

    // ------------------------------------------------
    // Helpers
    // ------------------------------------------------

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove("hidden");
    }

    function clearError() {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
    }

    function createElement(tag, text, className) {
        const element = document.createElement(tag);

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        if (className) {
            element.className = className;
        }

        return element;
    }

    // ------------------------------------------------
    // File selection
    // ------------------------------------------------

    fileInput.addEventListener("change", () => {

        clearError();
        result.classList.add("hidden");
        saveMessage.textContent = "";

        const file = fileInput.files[0];

        fileDetails.replaceChildren();

        if (!file) {
            fileDetails.textContent = "No file selected.";
            return;
        }

        const details = [
            `Filename: ${file.name}`,
            `File type: ${file.type || "Unknown"}`,
            `File size: ${(file.size / 1024).toFixed(2)} KB`
        ];

        details.forEach(text => {
            fileDetails.appendChild(createElement("p", text));
        });
    });

    // ------------------------------------------------
    // Create editable input
    // ------------------------------------------------

    function createInput(labelText, name, value, type = "text") {

        const wrapper = createElement("div", null, "edit-field");

        const label = createElement("label", labelText);
        label.htmlFor = name;

        const input = document.createElement("input");

        input.id = name;
        input.name = name;
        input.type = type;

        if (value !== null && value !== undefined) {
            input.value = value;
        } else {
            input.value = "";
        }

        if (type === "number") {
            input.step = "any";
        }

        wrapper.append(label, input);

        resultContent.appendChild(wrapper);

        return input;
    }

    // ------------------------------------------------
    // Display extracted bill for editing
    // ------------------------------------------------

    function displayResults(data) {

        currentBill = data;

        resultContent.replaceChildren();

        createInput(
            "Merchant Name",
            "merchant_name",
            data.merchant_name
        );

        createInput(
            "Bill Date",
            "bill_date",
            data.bill_date,
            "text"
        );

        createInput(
            "Subtotal",
            "subtotal",
            data.subtotal,
            "number"
        );

        createInput(
            "Tax",
            "tax",
            data.tax,
            "number"
        );

        createInput(
            "Total Amount",
            "total_amount",
            data.total_amount,
            "number"
        );

        createInput(
            "Currency",
            "currency",
            data.currency
        );

        const itemsHeading = createElement("h2", "Items");

        resultContent.appendChild(itemsHeading);

        const items = Array.isArray(data.items) ? data.items : [];

        items.forEach((item, index) => {

            const itemCard = createElement("div", null, "item-card");

            const heading = createElement("h3", `Item ${index + 1}`);

            itemCard.appendChild(heading);

            resultContent.appendChild(itemCard);

            createInput(
                `Item ${index + 1} Name`,
                `item_name_${index}`,
                item.item_name
            );

            createInput(
                `Item ${index + 1} Quantity`,
                `quantity_${index}`,
                item.quantity,
                "number"
            );

            createInput(
                `Item ${index + 1} Price`,
                `price_${index}`,
                item.price,
                "number"
            );
        });

        result.classList.remove("hidden");
    }

    // ------------------------------------------------
    // Scan bill
    // ------------------------------------------------

    uploadForm.addEventListener("submit", async event => {

        event.preventDefault();

        clearError();

        const file = fileInput.files[0];

        if (!file) {
            showError("Please select a bill image.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            showError("Please select a valid image.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showError("Image must be smaller than 10 MB.");
            return;
        }

        const formData = new FormData();

        formData.append("file", file);

        loading.classList.remove("hidden");

        scanButton.disabled = true;
        scanButton.textContent = "Scanning...";

        try {

            const response = await fetch("/upload", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Scanning failed.");
            }

            if (!data.success || !data.extracted) {
                throw new Error("No bill information was extracted.");
            }

            displayResults(data.extracted);

        } catch (error) {

            console.error(error);

            showError(error.message);

        } finally {

            loading.classList.add("hidden");

            scanButton.disabled = false;
            scanButton.textContent = "Scan Bill";
        }
    });

    // ------------------------------------------------
    // Convert form values
    // ------------------------------------------------

    function getNumberValue(name) {

        const value = editForm.elements[name].value;

        if (value === "") {
            return null;
        }

        const number = Number(value);

        return Number.isFinite(number) ? number : null;
    }

    // ------------------------------------------------
    // Save corrected bill
    // ------------------------------------------------

    editForm.addEventListener("submit", async event => {

        event.preventDefault();

        if (!currentBill) {
            showError("Please scan a bill first.");
            return;
        }

        saveMessage.textContent = "";

        const items = (currentBill.items || []).map((item, index) => {

            return {
                item_name: editForm.elements[`item_name_${index}`].value,
                quantity: getNumberValue(`quantity_${index}`),
                price: getNumberValue(`price_${index}`)
            };
        });

        const correctedBill = {

            merchant_name: editForm.elements.merchant_name.value,
            bill_date: editForm.elements.bill_date.value,

            subtotal: getNumberValue("subtotal"),
            tax: getNumberValue("tax"),
            total_amount: getNumberValue("total_amount"),

            currency: editForm.elements.currency.value,

            items: items
        };

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {

            const response = await fetch("/bills", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(correctedBill)

            });

            const data = await response.json();

            console.log("Backend response:", data);

            if (!response.ok) {
                throw new Error(data.detail || "Could not save bill.");
            }

            saveMessage.textContent = "Bill saved successfully!";

            await loadSavedBills();

        } catch (error) {

            showError(error.message);

        } finally {

            saveButton.disabled = false;
            saveButton.textContent = "Save Corrected Bill";
        }
    });

    // ------------------------------------------------
    // Load saved bills
    // ------------------------------------------------

    async function loadSavedBills() {

        savedBills.replaceChildren();

        try {

            const response = await fetch("/bills");

            const bills = await response.json();

            if (!response.ok) {
                throw new Error("Could not load saved bills.");
            }

            if (bills.length === 0) {

                savedBills.textContent = "No bills saved yet.";

                return;
            }

            bills.forEach(bill => {

                const card = createElement("div", null, "bill-card");

                card.appendChild(
                    createElement("h3", bill.merchant_name || "Unknown Merchant")
                );

                card.appendChild(
                    createElement("p", `Date: ${bill.bill_date || "Unknown"}`)
                );

                card.appendChild(
                    createElement(
                        "p",
                        `Total: ${bill.currency || ""} ${bill.total_amount ?? "N/A"}`
                    )
                );

                const deleteButton = createElement(
                    "button",
                    "Delete Bill",
                    "delete-button"
                );

                deleteButton.type = "button";

                deleteButton.addEventListener("click", async () => {

                    const confirmed = confirm("Delete this saved bill?");

                    if (!confirmed) {
                        return;
                    }

                    try {

                        const deleteResponse = await fetch(
                            `/bills/${bill.id}`,
                            {
                                method: "DELETE"
                            }
                        );

                        const deleteData = await deleteResponse.json();

                        if (!deleteResponse.ok) {
                            throw new Error(
                                deleteData.detail || "Delete failed."
                            );
                        }

                        await loadSavedBills();

                    } catch (error) {

                        showError(error.message);
                    }
                });

                card.appendChild(deleteButton);

                savedBills.appendChild(card);
            });

        } catch (error) {

            savedBills.textContent = "Could not load saved bills.";

            console.error(error);
        }
    }

    // ------------------------------------------------
    // Refresh saved bills
    // ------------------------------------------------

    refreshBills.addEventListener("click", loadSavedBills);

    // Load saved bills when application opens
    loadSavedBills();

});
