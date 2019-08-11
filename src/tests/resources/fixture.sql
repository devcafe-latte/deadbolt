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
  `email` varchar(255) DEFAULT NULL,
  `firstName` varchar(100) DEFAULT NULL,
  `lastName` varchar(100) DEFAULT NULL,
  `active` tinyint(4) NOT NULL DEFAULT 1,
  `created` int(11) NOT NULL DEFAULT 0,
  `lastActivity` int(11) NOT NULL DEFAULT 0,
  `emailConfirmed` int(11) DEFAULT NULL,
  `emailConfirmToken` varchar(36) DEFAULT NULL,
  `emailConfirmTokenExpires` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `user` (`id`, `uuid`, `username`, `email`, `firstName`, `lastName`, `active`, `created`, `lastActivity`, `emailConfirmed`, `emailConfirmToken`, `emailConfirmTokenExpires`) VALUES
(1,	'ee13624b-cf22-4597-adb9-bfa4b16baa71',	'Co',	NULL,	NULL,	NULL,	1,	0,	0,	1565550000,	NULL,	NULL),
(2,	'db3df155-3b3e-4557-bfab-fa544fabf7ee',	'Jordan',	'jordan@example.com',	'Jordan',	'Benge',	1,	0,	0,  1565550000,	NULL,	NULL);

DROP TABLE IF EXISTS `session`;
CREATE TABLE `session` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `token` varchar(32) NOT NULL,
  `userId` int(11) NOT NULL,
  `created` int(11) NOT NULL,
  `expires` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `session_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `membership`;
CREATE TABLE `membership` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created` int(11) NOT NULL,
  `app` varchar(100) NOT NULL,
  `role` varchar(100) NOT NULL,
  `userId` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `membership_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `membership` (`id`, `created`, `app`, `role`, `userId`) VALUES
(1,	1565516907,	'test-app',	'admin',	1),
(2,	1565516907,	'test-app',	'user',	1);

DROP TABLE IF EXISTS `authPassword`;
CREATE TABLE `authPassword` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `resetToken` varchar(36) DEFAULT NULL,
  `resetTokenExpires` int(11) DEFAULT NULL,
  `created` int(11) NOT NULL,
  `updated` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `userId` (`userId`),
  CONSTRAINT `authPassword_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

INSERT INTO `authPassword` (`id`, `userId`, `passwordHash`, `resetToken`, `resetTokenExpires`, `created`, `updated`) VALUES
(1,	1,	'$2b$10$Y.Vdh2cW/knJHGXBhm1rwuXTsVcVgmnunOmnqA0CXDmqVdW/rpL62',	NULL,	NULL,	0,	0),
(2,	2,	'$2b$10$1kdgXCXIR601WcDco46hcu0ga6TZBVxnnUTlevm7wYpsYC9wophY2',	NULL,	NULL,	0,	0);


-- 2019-08-11 08:27:25
