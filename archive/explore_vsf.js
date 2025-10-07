// Output the members of the resol-vbus-core-vsf package

try {
    const vsfspecification = require('resol-vbus-core-vsf');

    console.log('--- EXPLORATION START ---');

    // 1. Output all top-level keys exported by the module
    console.log('Top-level exports (keys):', Object.keys(vsfspecification));

    // 2. Try to inspect the most likely candidate, VsFFile, if it exists
    if (vsfspecification.VsFFile) {
        console.log('\nFound VsFFile. Is it a class or function?', typeof vsfspecification.VsFFile);
        
        // If it is a function/class, we can check its prototype for methods
        if (typeof vsfspecification.VsFFile === 'function') {
            const prototypeKeys = Object.getOwnPropertyNames(vsfspecification.VsFFile.prototype);
            console.log('VsFFile prototype methods (keys):', prototypeKeys);
        }
    } else {
        console.log('\nCould not find VsFFile directly in the exports.');
    }

    console.log('--- EXPLORATION END ---');

} catch (error) {
    console.error('Error loading resol-vbus-core-vsf. Did you run npm install resol-vbus-core-vsf?');
    console.error(error.message);
}