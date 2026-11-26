<?php

namespace Tests\Support;

use ZipArchive;

trait CreatesZipPackages
{
    /** @var list<string> */
    private array $zipPackagePaths = [];

    /**
     * @param  array<string, string>  $files
     * @param  list<string>  $symlinks
     */
    protected function zipPackage(array $files, array $symlinks = []): string
    {
        $path = tempnam(sys_get_temp_dir(), 'gp-zip-test-');
        self::assertNotFalse($path);

        $zip = new ZipArchive;
        self::assertTrue($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE));

        foreach ($files as $name => $contents) {
            self::assertTrue($zip->addFromString($name, $contents));
        }

        foreach ($symlinks as $name) {
            self::assertTrue($zip->addFromString($name, 'target.html'));
            self::assertTrue($zip->setExternalAttributesName(
                $name,
                ZipArchive::OPSYS_UNIX,
                0120777 << 16,
            ));
        }

        self::assertTrue($zip->close());
        $this->zipPackagePaths[] = $path;

        return $path;
    }

    protected function tearDown(): void
    {
        foreach ($this->zipPackagePaths as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }

        parent::tearDown();
    }
}
