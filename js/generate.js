window.addEventListener('DOMContentLoaded', function() {

    document.getElementById('cert_format').addEventListener('change', function() {
        document.getElementById('password').value = '';

        const certFormat = document.getElementById('cert_format').value;
        const passwordLabel = document.getElementById('password_label');

        if (certFormat === 'pfx' || certFormat === 'p12') {
            passwordLabel.classList.remove('hidden');
        } else {
            passwordLabel.classList.add('hidden');
        }
    });

    document.getElementById('generate_form').addEventListener('submit', function(event) {
        event.preventDefault();
        generateCert();
    });

    function generateCert() {
            const cn = document.getElementById('cn').value;
            const organization = document.getElementById('org').value;
            const organizationalUnit = document.getElementById('org_unit').value;
            const locality = document.getElementById('locality').value;
            const state = document.getElementById('state').value;
            const country = document.getElementById('country').value;
            const years = parseInt(document.getElementById('years').value);
            const password = document.getElementById('password').value;
            const certFormat = document.getElementById('cert_format').value;
            const keySize = parseInt(document.getElementById('key_size').value);

            const pki = forge.pki;
            const keys = pki.rsa.generateKeyPair({ bits: keySize, e: 0x10001 });

            const cert = pki.createCertificate();
            cert.publicKey = keys.publicKey;
            cert.serialNumber = (Math.floor(Math.random() * 1e16)).toString(16);
            const now = new Date();
            cert.validity.notBefore = now;
            cert.validity.notAfter = new Date();
            cert.validity.notAfter.setFullYear(now.getFullYear() + years);

            const attrs = [
                { name: 'commonName', value: cn },
                { name: 'organizationName', value: organization },
                { shortName: 'OU', value: organizationalUnit },
                { name: 'localityName', value: locality },
                { name: 'stateOrProvinceName', value: state },
                { name: 'countryName', value: country }
            ];
            cert.setSubject(attrs);
            cert.setIssuer(attrs);

            cert.setExtensions([
                { name: 'basicConstraints', cA: true },
                { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true },
                { name: 'subjectAltName', altNames: [{ type: 2, value: cn }] }
            ]);

            cert.sign(keys.privateKey, forge.md.sha256.create());

            const pemCert = pki.certificateToPem(cert);
            const pemKey = pki.privateKeyToPem(keys.privateKey);

            if (certFormat === 'pem-bundle') {
                download(`${cn}.pem`, pemCert + pemKey);
            } else if (certFormat === 'pem') {
                download(`${cn}.crt`, pemCert);
                download(`${cn}.key`, pemKey);
            } else if (certFormat === 'pfx' || certFormat === 'p12') {
                const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
                    keys.privateKey, [cert],
                    password || null,
                    { algorithm: '3des' }
                );
                const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
                const p12b64 = forge.util.encode64(p12Der);
                const p12Blob = new Blob([forge.util.decode64(p12b64)], { type: 'application/x-pkcs12' });
                downloadBlob(p12Blob, `${cn}.${certFormat}`);
            }
        }

        function download(filename, text) {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', filename);
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        }

        function downloadBlob(blob, filename) {
            const url = window.URL.createObjectURL(blob);
            const element = document.createElement('a');
            element.href = url;
            element.download = filename;
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(element);
        }
});

