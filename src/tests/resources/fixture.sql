-- Adminer 4.7.0 MySQL dump

SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

USE `deadbolt_test`;

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` varchar(36) NOT NULL,
  `username` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created` int(11) NOT NULL DEFAULT 0,
  `lastActivity` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `uuid`, `username`, `passwordHash`, `email`, `firstName`, `lastName`, `active`, `created`, `lastActivity`) VALUES
(1,	'ee13624b-cf22-4597-adb9-bfa4b16baa71',	'Co',	'$2b$10$Y.Vdh2cW/knJHGXBhm1rwuXTsVcVgmnunOmnqA0CXDmqVdW/rpL62',	NULL,	NULL,	NULL,	1,	0,	0),
(2,	'db3df155-3b3e-4557-bfab-fa544fabf7ee',	'Jordan',	'$2b$10$1kdgXCXIR601WcDco46hcu0ga6TZBVxnnUTlevm7wYpsYC9wophY2',	'jordan@example.com',	'Jordan',	'Benge',	1,	0,	0);

DROP TABLE IF EXISTS `session`;
CREATE TABLE `session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(32) NOT NULL,
  `userId` int(11) NOT NULL,
  `created` int(11) NOT NULL,
  `expires` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `session_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


-- 2019-08-11 08:27:25
