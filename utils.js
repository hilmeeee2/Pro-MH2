/**
 * Generate a new license key in the format NGP-XXXX-XXXX-XXXX
 */
export function generateKey() {
    const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    return `NGP-${segment()}-${segment()}-${segment()}`;
}

/**
 * Calculate days left until expiry
 */
export function calculateDaysLeft(expiryDate) {
    if (!expiryDate) return 0;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine status based on days left
 */
export function getStatus(expiryDate) {
    const days = calculateDaysLeft(expiryDate);
    if (days < 0) return 'منتهي';
    if (days <= 7) return 'تحذير';
    return 'نشط';
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
}

/**
 * Export data to CSV (Excel compatible) with Arabic support
 */
export function exportToCSV(data, filename) {
    const BOM = '\uFEFF';
    const headers = ['اسم المتجر', 'رقم الجوال', 'تاريخ الانتهاء', 'المتبقي', 'الحالة', 'المساحة المستخدمة'];
    const rows = data.map(store => [
        store.name,
        store.phone,
        formatDate(store.expiryDate),
        calculateDaysLeft(store.expiryDate),
        getStatus(store.expiryDate),
        `${(store.storageUsed || 0).toFixed(2)} MB`
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
