const pickAndMap = (data, keyMap) => {
    const result = {};
    for (const [sourceKey, targetKey] of Object.entries(keyMap)) {
        if (data[sourceKey] !== undefined) {
            result[targetKey] = data[sourceKey];
        }
    }
    return result;
};

module.exports = { pickAndMap };
