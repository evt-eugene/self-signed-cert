window.addEventListener('DOMContentLoaded', function () {

  const SUPPORTED_EXTENSIONS = ['pem', 'crt', 'key', 'p7b', 'pfx', 'p12'];
  const SIGNATURE_ALGORITHMS = {
    '1.2.840.113549.1.1.2': {name: 'MD2 with RSA', securityLevel: 'Weak (deprecated)'},
    '1.2.840.113549.1.1.3': {name: 'MD4 with RSA', securityLevel: 'Weak (deprecated)'},
    '1.2.840.113549.1.1.4': {name: 'MD5 with RSA', securityLevel: 'Weak (deprecated)'},
    '1.2.840.113549.1.1.5': {name: 'SHA-1 with RSA', securityLevel: 'Weak (deprecated)'},
    '1.2.840.10040.4.3': {name: 'SHA-1 with DSA', securityLevel: 'Weak (deprecated)'},
    '1.2.840.10045.4.1': {name: 'SHA-1 with ECDSA', securityLevel: 'Weak (deprecated)'},
    '1.3.14.3.2.29': {name: 'SHA-1 with RSA (old)', securityLevel: 'Weak (deprecated)'},
    '1.2.840.10045.4.3.1': {name: 'SHA-224 with ECDSA', securityLevel: 'Strong'},
    '1.2.840.113549.1.1.14': {name: 'SHA-224 with RSA', securityLevel: 'Strong'},
    '2.16.840.1.101.3.4.3.1': {name: 'SHA-224 with DSA', securityLevel: 'Strong'},
    '1.2.840.113549.1.1.11': {name: 'SHA-256 with RSA', securityLevel: 'Strong'},
    '2.16.840.1.101.3.4.3.2': {name: 'SHA-256 with DSA', securityLevel: 'Strong'},
    '1.2.840.10045.4.3.2': {name: 'SHA-256 with ECDSA', securityLevel: 'Strong'},
    '1.2.840.113549.1.1.12': {name: 'SHA-384 with RSA', securityLevel: 'Very Strong'},
    '1.2.840.10045.4.3.3': {name: 'SHA-384 with ECDSA', securityLevel: 'Very Strong'},
    '1.2.840.113549.1.1.13': {name: 'SHA-512 with RSA', securityLevel: 'Very Strong'},
    '1.2.840.10045.4.3.4': {name: 'SHA-512 with ECDSA', securityLevel: 'Very Strong'},
    '1.2.840.113549.1.1.10': {name: 'RSA-PSS', securityLevel: 'Very Strong'},
    '1.3.101.112': {name: 'Ed25519', securityLevel: 'Very Strong'},
    '1.3.101.113': {name: 'Ed448', securityLevel: 'Very Strong'},
    '1.2.643.2.2.3': {name: 'GOST R 34.11-94 with GOST R 34.10-2001', securityLevel: 'Weak (deprecated)'},
    '1.2.643.7.1.1.3.2': {name: 'GOST R 34.11-2012 with GOST R 34.10-2012 (256 bit)', securityLevel: 'Moderate To Strong'},
    '1.2.643.7.1.1.3.3': {name: 'GOST R 34.11-2012 with GOST R 34.10-2012 (512 bit)', securityLevel: 'Very Strong'}
  };
  const CURVES = {
    '1.2.840.10045.3.1.7': 'secp256r1 (P-256)',
    '1.3.132.0.34': 'secp384r1 (P-384)',
    '1.3.132.0.35': 'secp521r1 (P-521)',
    '1.2.840.10045.3.1.1': 'secp192r1 (P-192)',
    '1.3.132.0.33': 'secp224r1 (P-224)',
    '1.3.132.0.10': 'secp256k1'
  };

  document.getElementById('cert_file').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) {
      return;
    }

    document.getElementById('cert_details').classList.add('hidden');

    const extension = file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      alert('Unsupported file type');
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      const cert = parseCertificate(e.target.result, extension);
      displayCertDetails(cert);
    };

    reader.onerror = function () {
      console.error('File reading error', e);
      alert('Error reading file. Please try again.');
    };

    if (extension === 'pfx' || extension === 'p12') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });

  function parseCertificate(content, extension) {
    try {
      return extension === 'pfx' || extension === 'p12' ? parsePkcs12(arrayBufferToBinaryString(content)) : parsePem(content);
    } catch (error) {
      alert(`Error parsing certificate: ${error.message}`);
      throw error;
    }
  }

  function arrayBufferToBinaryString(buffer) {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    return binaryString;
  }

  function parsePkcs12(content) {
    const password = prompt("Enter password for the PFX/PKCS#12 file (leave empty if none):", "");
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(content));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password || '');

    const bagType = forge.pki.oids.certBag;
    const bagsObject = p12.getBags({bagType: bagType});
    const bags = bagsObject[bagType];
    if (!bags || bags.length === 0) {
      throw new Error('No certificate found in the PKCS#12 file');
    }

    return bags[0].cert;
  }

  function parsePem(content) {
    try {
      return forge.pki.certificateFromPem(content);
    } catch (e) {
      const message = content.includes('BEGIN PRIVATE KEY') ? 'This appears to be a private key file. Please provide a certificate file instead.' : 'Invalid certificate format';
      throw new Error(message);
    }
  }

  function displayCertDetails(cert) {
    document.getElementById('cert_details').classList.remove('hidden');

    document.getElementById('cert_serial').textContent = cert.serialNumber;
    document.getElementById('cert_version').textContent = `V${cert.version + 1}`;

    const issuerAttributes = cert.issuer.attributes;
    document.getElementById('issuer_common_name').textContent = findCommonName(issuerAttributes);
    document.getElementById('issuer_organization').textContent = findOrganization(issuerAttributes);
    document.getElementById('issuer_organizational_unit').textContent = findOrganizationalUnit(issuerAttributes);
    document.getElementById('issuer_locality').textContent = findLocality(issuerAttributes);
    document.getElementById('issuer_state').textContent = findState(issuerAttributes);
    document.getElementById('issuer_country').textContent = findCountry(issuerAttributes);
    document.getElementById('issuer_email').textContent = findEmail(issuerAttributes);

    const subjectAttributes = cert.subject.attributes;
    document.getElementById('subject_common_name').textContent = findCommonName(subjectAttributes);
    document.getElementById('subject_organization').textContent = findOrganization(subjectAttributes);
    document.getElementById('subject_organizational_unit').textContent = findOrganizationalUnit(subjectAttributes);
    document.getElementById('subject_locality').textContent = findLocality(subjectAttributes);
    document.getElementById('subject_state').textContent = findState(subjectAttributes);
    document.getElementById('subject_country').textContent = findCountry(subjectAttributes);
    document.getElementById('subject_email').textContent = findEmail(subjectAttributes);

    document.getElementById('cert_not_before').textContent = formatDate(cert.validity.notBefore);
    document.getElementById('cert_not_after').textContent = formatDate(cert.validity.notAfter);

    const algorithmOid = cert.siginfo?.algorithmOid || cert.signatureOid;
    document.getElementById('cert_sig_alg').textContent = getSignatureAlgorithmName(algorithmOid);
    document.getElementById('cert_sig_alg_security_level').textContent = getSignatureAlgorithmSecurityLevel(algorithmOid);

    const algorithmParameters = cert.siginfo?.parameters || cert.signatureParameters || cert.tbsCertificate?.signatureAlgorithm?.parameters;
    document.getElementById('cert_sig_params').textContent = getSignatureAlgorithmParameters(algorithmOid, algorithmParameters);
    document.getElementById('cert_signature').textContent = formatHex(forge.util.bytesToHex(cert.signature));

    const publicKey = cert.publicKey;
    document.getElementById('cert_key_alg').textContent = 'RSA';
    document.getElementById('cert_key_size').textContent = `${publicKey.n ? publicKey.n.bitLength() : 0} bits`;
    document.getElementById('cert_key_exponent').textContent = publicKey.e ? publicKey.e.toString(10) : '';
    document.getElementById('cert_key_modulus').textContent = publicKey.n ? formatHex(publicKey.n.toString(16)) : '';
    document.getElementById('cert_public_key').textContent = forge.pki.publicKeyToPem(publicKey);
    document.getElementById('cert_key_usage').textContent = keyUsage(cert.extensions);

    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
    const sha1 = forge.md.sha1.create().update(certDer).digest().toHex();
    const sha256 = forge.md.sha256.create().update(certDer).digest().toHex();

    document.getElementById('cert_sha1').textContent = formatFingerprint(sha1);
    document.getElementById('cert_sha256').textContent = formatFingerprint(sha256);
  }

  function findCommonName(attributes) {
    return findAttributeValue(attributes, ['commonName', 'CN']);
  }

  function findOrganization(attributes) {
    return findAttributeValue(attributes, ['organizationName', 'O']);
  }

  function findOrganizationalUnit(attributes) {
    return findAttributeValue(attributes, ['organizationalUnitName', 'OU']);
  }

  function findLocality(attributes) {
    return findAttributeValue(attributes, ['localityName', 'L']);
  }

  function findState(attributes) {
    return findAttributeValue(attributes, ['stateOrProvinceName', 'ST']);
  }

  function findCountry(attributes) {
    return findAttributeValue(attributes, ['countryName', 'C']);
  }

  function findEmail(attributes) {
    return findAttributeValue(attributes, ['emailAddress', 'E']);
  }

  function findAttributeValue(attributes, attributeNames) {
    const foundAttr = attributes.find(attr => attributeNames.includes(attr.name) || attributeNames.includes(attr.shortName));
    return foundAttr ? foundAttr.value : 'Not specified';
  }

  function keyUsage(extensions) {
    const keyUsageExt = extensions.find(ext => ext.name === 'keyUsage');
    if (!keyUsageExt) {
      return 'Not specified';
    }

    const usages = Object.entries(keyUsageExt)
      .filter(entry => entry.key !== 'id')
      .filter(entry => entry.key !== 'name')
      .filter(entry => entry.value === true)
      .map(entry => entry.key)
      .join(', ');

    return usages || 'Not specified';
  }

  function getSignatureAlgorithmName(oid) {
    const algo = SIGNATURE_ALGORITHMS[oid];
    return algo ? algo.name : `Unknown algorithm (${oid || '-'})`;
  }

  function getSignatureAlgorithmSecurityLevel(oid) {
    const algo = SIGNATURE_ALGORITHMS[oid];
    return algo ? algo.securityLevel : 'Unknown';
  }

  function getSignatureAlgorithmParameters(oid, parameters) {
    if (!parameters) {
      return 'None (NULL)';
    }
    if (parameters.tagClass !== undefined && parameters.type === 5) {
      return 'NULL';
    }
    if (oid === '1.2.840.113549.1.1.10') {
      return formatRsaPssParameters(parameters);
    }
    if (oid && oid.startsWith('1.2.840.10045.4')) {
      return formatEcdsaParameters(parameters);
    }
    return formatGenericParameters(parameters);
  }

  function formatRsaPssParameters(params) {
    const lines = ['RSA-PSS Parameters:'];

    if (params.hashAlgorithm) {
      const hashOid = typeof params.hashAlgorithm === 'string' ? params.hashAlgorithm : params.hashAlgorithm.algorithm;
      lines.push(`  Hash Algorithm: ${getHashAlgorithmName(hashOid)} (${hashOid})`);
    }
    if (params.mgf) {
      const mgfOid = typeof params.mgf === 'string' ? params.mgf : params.mgf.algorithm;
      lines.push(`  MGF: ${getMgfName(mgfOid)} (${mgfOid})`);
    }
    if (params.saltLength !== undefined) {
      lines.push(`  Salt Length: ${params.saltLength} bytes`);
    }
    if (params.trailerField !== undefined) {
      lines.push(`  Trailer Field: ${params.trailerField}`);
    }
    return lines.join('\n');
  }

  function formatEcdsaParameters(params) {
    if (!params) {
      return 'None';
    }
    if (params.namedCurve) {
      return `Named Curve: ${getCurveName(params.namedCurve)} (${params.namedCurve})`;
    }
    if (params.curve) {
      return `Curve OID: ${params.curve}`;
    }
    return formatGenericParameters(params);
  }

  function getCurveName(oid) {
    return CURVES[oid] || `Unknown curve`;
  }

  function formatGenericParameters(params) {
    if (params === null || params === undefined) {
      return 'None (NULL)';
    }
    if (typeof params === 'string') {
      return `String: "${params}"`;
    }
    if (typeof params === 'number') {
      return `Number: ${params}`;
    }
    if (Array.isArray(params)) {
      return `Array: [${params.map(p => formatSingleParameter(p)).join(', ')}]`;
    }
    if (typeof params === 'object') {
      if (params.tagClass !== undefined) {
        return formatAsn1Parameter(params);
      }

      const entries = Object.entries(params)
      if (entries.length > 0) {
        const formattedEntries = entries
          .map(([key, value]) => `${key}: ${formatSingleParameter(value)}`)
          .join(', ');

        return `Object: {${formattedEntries}}`;
      }
      return 'None';
    }
    return `Unknown type: ${typeof params}`;
  }

  function formatAsn1Parameter(asn1Obj) {
    const tagTypes = {
      1: 'BOOLEAN',
      2: 'INTEGER',
      3: 'BIT STRING',
      4: 'OCTET STRING',
      5: 'NULL',
      6: 'OBJECT IDENTIFIER',
      12: 'UTF8 STRING',
      16: 'SEQUENCE',
      17: 'SET'
    };

    const tagType = tagTypes[asn1Obj.type] || `Unknown(${asn1Obj.type})`;
    if (asn1Obj.type === 5) {
      return 'NULL';
    }
    if (asn1Obj.type === 6) {
      return `OID: ${asn1Obj.value}`;
    }
    if (asn1Obj.type === 2) {
      return `INTEGER: ${asn1Obj.value}`;
    }
    if (asn1Obj.type === 4) {
      const hex = Array.from(asn1Obj.value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(':');

      return `OCTET STRING: ${hex}`;
    }
    return `${tagType}: ${asn1Obj.value || '[Complex Structure]'}`;
  }

  function formatSingleParameter(param) {
    if (param === null || param === undefined) return 'null';
    if (typeof param === 'string') return `"${param}"`;
    if (typeof param === 'number') return param.toString();
    if (typeof param === 'boolean') return param.toString();
    if (typeof param === 'object') {
      if (param.tagClass !== undefined) {
        return formatAsn1Parameter(param);
      }
      return JSON.stringify(param);
    }
    return String(param);
  }

  function formatDate(date) {
    return date.toUTCString();
  }

  function formatHex(hex, lineLength = 32) {
    let result = '';
    for (let i = 0; i < hex.length; i += lineLength) {
      result += hex.substring(i, i + lineLength) + '\n';
    }
    return result.trim();
  }

  function formatFingerprint(fingerprint) {
    return fingerprint.match(/.{2}/g).join(':');
  }
});
