<?php

namespace App\Exceptions;

use RuntimeException;

/** A user-safe validation failure during game upload processing. */
final class UploadFailure extends RuntimeException {}
