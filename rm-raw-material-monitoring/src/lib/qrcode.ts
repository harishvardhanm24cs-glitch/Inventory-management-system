import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 */
export const generateQRCode = async (text: string): Promise<string> => {
    try {
        const qrCodeDataUrl = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        return qrCodeDataUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
};

/**
 * Download QR code as PNG image
 */
export const downloadQRCode = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Print QR code
 */
export const printQRCode = (dataUrl: string, title?: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print QR Code</title>
            <style>
                body {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    font-family: Arial, sans-serif;
                }
                img {
                    max-width: 400px;
                    margin: 20px;
                }
                h2 {
                    margin: 10px;
                    color: #333;
                }
                @media print {
                    body {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            ${title ? `<h2>${title}</h2>` : ''}
            <img src="${dataUrl}" alt="QR Code" />
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
    }, 250);
};
/**
 * Print multiple QR codes for labels/stickers (Phase 6)
 */
export const printBulkQRCodes = (items: { id: string, qr: string, name?: string }[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bulk QR Print</title>
            <style>
                body {
                    margin: 0;
                    padding: 1cm;
                    font-family: 'Inter', sans-serif;
                }
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, 5cm);
                    gap: 1cm;
                    justify-content: center;
                }
                .qr-card {
                    width: 5cm;
                    height: 5cm;
                    border: 1px solid #eee;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.5cm;
                    box-sizing: border-box;
                    page-break-inside: avoid;
                }
                .qr-card img {
                    width: 3.5cm;
                    height: 3.5cm;
                    object-contain: fit;
                }
                .qr-card .label {
                    margin-top: 0.2cm;
                    font-size: 10pt;
                    font-weight: bold;
                    text-align: center;
                    word-break: break-all;
                }
                .qr-card .id {
                    font-size: 8pt;
                    color: #666;
                    margin-top: 0.1cm;
                }
                @media print {
                    @page {
                        margin: 1cm;
                    }
                    .qr-card {
                        border: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="grid">
                ${items.map(item => `
                    <div class="qr-card">
                        ${item.name ? `<div class="label">${item.name}</div>` : ''}
                        <img src="${item.qr}" />
                        <div class="id">${item.id}</div>
                    </div>
                `).join('')}
            </div>
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `);

    printWindow.document.close();
};
