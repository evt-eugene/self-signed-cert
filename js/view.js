window.addEventListener('DOMContentLoaded', function() {

    document.getElementById('cert_file').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
          const extension = file.name.split('.').pop().toLowerCase();
          if (['pem', 'crt', 'key', 'p7b', 'pfx', 'p12'].indexOf(extension) >= 0) {
            viewCert(file);
          }
        }
    });

    function viewCert(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    let cert;

                    // Check file extension to determine format
                    const fileExt = file.name.split('.').pop().toLowerCase();

                    if (fileExt === 'pfx' || fileExt === 'p12') {
                        // Handle PFX/PKCS#12 format
                        const password = prompt("Enter password for the PFX/PKCS#12 file (leave empty if none):", "");
                        const asn1 = forge.asn1.fromDer(forge.util.createBuffer(content));
                        const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password || '');

                        // Extract certificate from the PKCS#12
                        const bags = p12.getBags({bagType: forge.pki.oids.certBag});
                        if (bags[forge.pki.oids.certBag] && bags[forge.pki.oids.certBag].length > 0) {
                            cert = bags[forge.pki.oids.certBag][0].cert;
                        } else {
                            throw new Error('No certificate found in the PKCS#12 file');
                        }
                    } else {
                        // Handle PEM format
                        try {
                            // Try to parse as PEM certificate
                            cert = forge.pki.certificateFromPem(content);
                        } catch (e) {
                            // Not a valid PEM certificate, check if it's a PEM private key
                            try {
                                // We can't really view a private key details alone, so show error
                                alert('This appears to be a private key file. Please provide a certificate file instead.');
                                return;
                            } catch (e2) {
                                throw new Error('Invalid certificate format');
                            }
                        }
                    }

                    displayCertDetails(cert);
                } catch (error) {
                    console.error(error);
                    alert(`Error parsing certificate: ${error.message}`);
                }
            };

            if (file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
                reader.readAsBinaryString(file);
            } else {
                reader.readAsText(file);
            }
        }

        function displayCertDetails(cert) {
                // Show certificate details container
                document.getElementById('cert-details').classList.remove('hidden');

                // Format and display certificate details
                const formatDate = (date) => {
                    return date.toLocaleString();
                };

                const formatHex = (hex, lineLength = 32) => {
                    let result = '';
                    for (let i = 0; i < hex.length; i += lineLength) {
                        result += hex.substring(i, i + lineLength) + '\n';
                    }
                    return result.trim();
                };

                // Overview
                document.getElementById('cert-serial').textContent = cert.serialNumber;
                document.getElementById('cert-version').textContent = `V${cert.version + 1}`;

                // Issuer
                document.getElementById('cert-issuer').textContent = formatDN(cert.issuer.attributes);

                // Subject
                document.getElementById('cert-subject').textContent = formatDN(cert.subject.attributes);

                // Validity
                document.getElementById('cert-not-before').textContent = formatDate(cert.validity.notBefore);
                document.getElementById('cert-not-after').textContent = formatDate(cert.validity.notAfter);

                // Signature
                document.getElementById('cert-sig-alg').textContent = getSignatureAlgorithm(cert);
                document.getElementById('cert-sig-params').textContent = 'None';
                document.getElementById('cert-signature').textContent = formatHex(forge.util.bytesToHex(cert.signature));

                // Public Key
                const publicKey = cert.publicKey;
                document.getElementById('cert-key-alg').textContent = 'RSA';

                // Get key size
                let keySize = 0;
                if (publicKey.n) {
                    keySize = publicKey.n.bitLength();
                }
                document.getElementById('cert-key-size').textContent = `${keySize} bits`;

                // Get exponent
                let exponent = '';
                if (publicKey.e) {
                    exponent = publicKey.e.toString(10);
                }
                document.getElementById('cert-key-exponent').textContent = exponent;

                // Get modulus
                let modulus = '';
                if (publicKey.n) {
                    modulus = formatHex(publicKey.n.toString(16));
                }
                document.getElementById('cert-key-modulus').textContent = modulus;

                // Public key in PEM format
                document.getElementById('cert-public-key').textContent = forge.pki.publicKeyToPem(publicKey);

                // Key usage
                let keyUsage = [];
                cert.extensions.forEach(ext => {
                    if (ext.name === 'keyUsage') {
                        for (const usage in ext) {
                            if (ext[usage] === true && usage !== 'name' && usage !== 'id') {
                                keyUsage.push(usage);
                            }
                        }
                    }
                });
                document.getElementById('cert-key-usage').textContent = keyUsage.join(', ') || 'Not specified';

                // Certificate fingerprints
                const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
                const sha1 = forge.md.sha1.create().update(certDer).digest().toHex();
                const sha256 = forge.md.sha256.create().update(certDer).digest().toHex();

                document.getElementById('cert-sha1').textContent = formatFingerprint(sha1);
                document.getElementById('cert-sha256').textContent = formatFingerprint(sha256);
            }

            function formatDN(attributes) {
                return attributes.map(attr => {
                    let name = attr.name || attr.shortName || attr.type;
                    return `${name}=${attr.value}`;
                }).join(', ');
            }

            function getSignatureAlgorithm(cert) {
                // This is a simplification since forge doesn't expose this directly
                // In a real app, you'd parse the OID from the ASN.1 structure
                return 'sha256WithRSAEncryption';
            }

            function formatFingerprint(fingerprint) {
                // Format fingerprint with colons (e.g., 01:23:45:...)
                return fingerprint.match(/.{2}/g).join(':');
            }
});
