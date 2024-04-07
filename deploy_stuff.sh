cp -R ./node_modules/hack-font/build/web ./public/src
cp inc/technologies.md public/technologies.md
echo \`\`\`json >> public/technologies.md
cat package.json >> public/technologies.md
echo \`\`\` >> public/technologies.md