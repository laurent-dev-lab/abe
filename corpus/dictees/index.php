<?php
// Protection contre le listing de répertoire
header('HTTP/1.0 403 Forbidden');
exit('Accès interdit.');
