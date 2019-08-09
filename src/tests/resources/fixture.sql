-- Adminer 4.7.0 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created` int(11) NOT NULL DEFAULT 0,
  `lastLogin` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `username`, `passwordHash`, `email`, `firstName`, `lastName`, `active`, `created`, `lastLogin`) VALUES
(1,	'Co',	'$2b$10$Y.Vdh2cW/knJHGXBhm1rwuXTsVcVgmnunOmnqA0CXDmqVdW/rpL62',	NULL,	NULL,	NULL,	1,	0,	0),
(2,	'Jordan',	'$2b$10$1kdgXCXIR601WcDco46hcu0ga6TZBVxnnUTlevm7wYpsYC9wophY2',	'jordan@devcafe.co',	'Jordan',	'Benge',	1,	0,	0);

-- 2019-08-09 14:19:53
