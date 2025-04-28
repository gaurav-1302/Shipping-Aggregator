const withMT = require("@material-tailwind/react/utils/withMT");

module.exports = withMT({
    content: [
        "./node_modules/flowbite/**/*.js",
        'node_modules/flowbite-react/lib/esm/**/*.js',
        "./src/**/*.{js,jsx,ts,tsx}",
        "path-to-your-node_modules/@material-tailwind/react/components/**/*.{js,ts,jsx,tsx}",
        "path-to-your-node_modules/@material-tailwind/react/theme/components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require('flowbite/plugin')({
            charts: true,
        }),
    ],
});