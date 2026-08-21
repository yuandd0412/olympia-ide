# KSyntax index.katesyntax

Pre-generated index for KSyntaxHighlighting 6.8.0. Produced by running
`katehighlightingindexer.exe` once with Qt DLLs in `PATH`.

## How to regenerate

`katehighlightingindexer.exe` takes four **positional** arguments (no `--source`/`--target`):
`output.katesyntax  schema.xsd  listing.xml  compressed-dir`. The listing XML
must reference every file the indexer should parse, and the compressed dir is
where the indexer writes intermediate compressed XML copies.

```powershell
$env:PATH = 'C:\Qt\6.8.0\mingw_64\bin;' + $env:PATH

# 1. Generate the 12 vendor-generated XML files (doxygenlua + 6 PHP variants + 5 Twig variants).
#    `third_party/syntax-highlighting` is gitignored; this is part of the vendoring step.
$genDir  = 'D:\oler-ide-v2\build\third_party\syntax-highlighting\data\generated\syntax'
$srcDir  = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\syntax'
$perl    = 'C:\Strawberry\perl\bin\perl.exe'
$genHtml = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\generators\generate-html.pl'
$genDox  = 'D:\oler-ide-v2\third_party\syntax-highlighting\data\generators\generate-doxygenlua.pl'
New-Item -ItemType Directory -Path $genDir -Force | Out-Null
foreach ($v in 'html','css','javascript','javascript-react','typescript','mustache') {
    & $perl $genHtml "$srcDir\$v.xml" "$genDir\$v-php.xml"
    & $perl $genHtml "$srcDir\$v.xml" "$genDir\$v-twig.xml"
}
& $perl $genDox "$srcDir\doxygen.xml" "$genDir\doxygenlua.xml"

# 2. Build a listing file (XML) of every input. mustache-twig.xml is excluded because
#    katehighlightingindexer flags its vendor-generated `##Twig/Twig` chain as
#    unreachable rules (upstream KSyntax 6.8.0 issue, not our problem to fix).
$listingFile = 'D:\oler-ide-v2\build\ksyntax-listing.xml'
$compressed  = 'D:\oler-ide-v2\build\ksyntax-compressed'
$body = "<listing>`n"
foreach ($f in (Get-ChildItem $srcDir -Filter '*.xml')) { $body += "  <item>$($f.FullName)</item>`n" }
foreach ($f in (Get-ChildItem $genDir -Filter '*.xml' | Where-Object Name -ne 'mustache-twig.xml')) {
    $body += "  <item>$($f.FullName)</item>`n"
}
$body += "</listing>`n"
Set-Content -LiteralPath $listingFile -Value $body -Encoding UTF8
New-Item -ItemType Directory -Path $compressed -Force | Out-Null

# 3. Run the indexer.
& D:\oler-ide-v2\build\bin\katehighlightingindexer.exe `
    D:\oler-ide-v2\resources\ksyntax\index.katesyntax `
    D:\oler-ide-v2\third_party\syntax-highlighting\data\schema\language.xsd `
    $listingFile `
    $compressed
```

Then commit the new `index.katesyntax` file. CMakeLists.txt copies it into
`build/` at configure time; the vendored `data/CMakeLists.txt` patch consumes
it instead of running the indexer.

## Why pre-generated

`katehighlightingindexer.exe` is a Qt 6 app that crashes (`STATUS_DLL_NOT_FOUND`)
when invoked at build time because Qt DLLs are not in `PATH` during
`add_custom_command`. Pre-generating the file once (with `PATH` set) and
copying it at build time avoids this. The index only changes when the
KSyntax version changes.
