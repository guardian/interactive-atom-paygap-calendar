import templateHTML from "./src/templates/main.html!text";
import rp from 'request-promise';
import Mustache from 'mustache';

export async function render() {
    let projectCopy = await rp({ uri: 'https://interactive.guim.co.uk/docsdata-test/1BxXGXMice-3-fCx61MLLDzx18bsE-n85w1SbaWHjiWE.json', json: true })

    projectCopy.Intro = projectCopy.Intro.split("<br><br>");

    const html = Mustache.render(templateHTML, projectCopy)

    return html;
}