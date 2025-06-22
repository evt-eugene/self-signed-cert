window.addEventListener('DOMContentLoaded', function() {

    document.getElementById('cert_file').addEventListener('change', function(event) {
        const file = event.target.files[0];
        viewFile(file);
    });

    document.getElementById('dropzone').addEventListener('drop', function(event) {
        event.preventDefault();

        const file = event.dataTransfer.files[0];
        viewFile(file);
    });

    document.getElementById('dropzone').addEventListener('dragover', function(event) {
        event.preventDefault();
    });

    function viewFile(file) {
        if (file) {
            const extension = file.name.split('.').pop().toLowerCase();
            if (['pem', 'crt', 'key', 'p7b', 'pfx', 'p12'].indexOf(extension) >= 0) {
                viewCert(file);
            }
        }
    }

    function viewCert(certFile) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const certPem = event.target.result;
            const cert = forge.pki.certificateFromPem(certPem);

            const certAttributes = cert.subject.attributes.map(attr => `${attr.name}: ${attr.value}`).join('\n');

            const certSummary = document.getElementById('cert_summary');
            certSummary.textContent = `Certificate Subject:\n ${certAttributes}`;
            certSummary.classList.add('visible');
        };

        reader.readAsText(certFile);
    }
});